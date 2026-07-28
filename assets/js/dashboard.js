/* ==========================================================
   Inteligência - AgroPets Gestão (regra 35 de docs/regras-negocio.md)
   Métricas calculadas 100% no cliente a partir dos JSONs/overlay local —
   sem backend. Foco: correlações que ajudam a decidir compra de estoque,
   contato com cliente e prevenção de churn — não vaidade de gráfico.
   ========================================================== */

let pessoas = [];
let pets = [];
let produtos = [];
let vendas = [];

async function carregarDados() {
    const dados = await AgroStore.carregarTudo("../assets/data/");
    pessoas = dados.pessoas;
    pets = dados.pets;
    produtos = dados.produtos;
    vendas = dados.vendas;
}

function pessoaPorId(id) { return pessoas.find(p => p.id === id); }
function petPorId(id) { return pets.find(p => p.id === id); }
function produtoPorId(id) { return produtos.find(p => p.id === id); }

function formatarMoeda(v) {
    return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

/* ---------------------- KPIs no topo ---------------------- */

function calcularKPIs() {
    const totalVendas = vendas.length;
    const receitaTotal = vendas.reduce((s, v) => s + v.total, 0);
    const ticketMedio = totalVendas ? receitaTotal / totalVendas : 0;

    const clientesComCompra = new Set(vendas.flatMap(v => v.responsaveis));
    const estoqueBaixoCount = produtos.filter(p => p.estoque <= p.estoque_minimo).length;

    return { totalVendas, receitaTotal, ticketMedio, clientesAtivos: clientesComCompra.size, estoqueBaixoCount };
}

function renderizarKPIs() {
    const k = calcularKPIs();
    const el = document.querySelector("#dash-kpis");
    el.innerHTML = `
        <div class="dash-kpi">
            <div class="kpi-label">Receita total registrada</div>
            <div class="kpi-valor">${formatarMoeda(k.receitaTotal)}</div>
            <div class="kpi-sub">${k.totalVendas} venda(s)</div>
        </div>
        <div class="dash-kpi">
            <div class="kpi-label">Ticket médio</div>
            <div class="kpi-valor">${formatarMoeda(k.ticketMedio)}</div>
            <div class="kpi-sub">por venda</div>
        </div>
        <div class="dash-kpi">
            <div class="kpi-label">Clientes com compra registrada</div>
            <div class="kpi-valor">${k.clientesAtivos}</div>
            <div class="kpi-sub">de ${pessoas.length} cadastrados</div>
        </div>
        <div class="dash-kpi ${k.estoqueBaixoCount > 0 ? "kpi-alerta" : ""}">
            <div class="kpi-label">Produtos em estoque crítico</div>
            <div class="kpi-valor">${k.estoqueBaixoCount}</div>
            <div class="kpi-sub">no mínimo ou abaixo</div>
        </div>
    `;
}

/* ---------------------- Vendas por mês (gráfico simples) ---------------------- */

function renderizarVendasPorMes() {
    const el = document.querySelector("#chart-vendas-mes");
    const porMes = {};

    vendas.forEach(v => {
        const mes = v.data.slice(0, 7); // YYYY-MM
        porMes[mes] = (porMes[mes] || 0) + v.total;
    });

    const meses = Object.keys(porMes).sort().slice(-6); // últimos 6 meses com dados
    if (meses.length === 0) {
        el.innerHTML = `<p class="dash-vazio">Sem vendas registradas ainda.</p>`;
        return;
    }

    const maxValor = Math.max(...meses.map(m => porMes[m]));
    const nomesMes = { "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr", "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago", "09": "Set", "10": "Out", "11": "Nov", "12": "Dez" };

    el.innerHTML = meses.map(m => {
        const valor = porMes[m];
        const altura = maxValor > 0 ? Math.max((valor / maxValor) * 100, 3) : 3;
        const [ano, mesNum] = m.split("-");
        return `
            <div class="barra-mes">
                <span class="barra-valor">${formatarMoeda(valor)}</span>
                <div class="barra-visual" style="height:${altura}%;"></div>
                <span class="barra-label">${nomesMes[mesNum] || mesNum}/${ano.slice(2)}</span>
            </div>
        `;
    }).join("");
}

/* ---------------------- Clientes em risco de churn ---------------------- */

/* Regra de negócio da métrica: um cliente "em risco" é alguém que já
   comprou 2+ vezes (ou seja, tinha um padrão) mas cuja última compra
   está mais distante do que o intervalo médio entre as compras dele
   multiplicado por 1.5 — sinal de que já deveria ter voltado. */
function calcularClientesEmRisco() {
    const porCliente = {};
    vendas.forEach(v => {
        v.responsaveis.forEach(id => {
            porCliente[id] = porCliente[id] || [];
            porCliente[id].push(v.data);
        });
    });

    const hoje = new Date();
    const resultado = [];

    Object.entries(porCliente).forEach(([id, datas]) => {
        if (datas.length < 2) return;
        datas.sort();
        const intervalos = [];
        for (let i = 1; i < datas.length; i++) {
            intervalos.push((new Date(datas[i]) - new Date(datas[i - 1])) / 86400000);
        }
        const mediaDias = intervalos.reduce((s, v) => s + v, 0) / intervalos.length;
        const ultimaCompra = new Date(datas[datas.length - 1]);
        const diasDesde = (hoje - ultimaCompra) / 86400000;

        if (diasDesde > mediaDias * 1.5 && mediaDias > 0) {
            resultado.push({
                pessoa: pessoaPorId(Number(id)),
                diasDesde: Math.round(diasDesde),
                mediaDias: Math.round(mediaDias),
                ultimaCompra: datas[datas.length - 1],
            });
        }
    });

    return resultado.sort((a, b) => (b.diasDesde - b.mediaDias) - (a.diasDesde - a.mediaDias)).slice(0, 8);
}

function renderizarClientesRisco() {
    const el = document.querySelector("#lista-clientes-risco");
    const lista = calcularClientesEmRisco().filter(r => r.pessoa);

    if (lista.length === 0) {
        el.innerHTML = `<p class="dash-vazio">Nenhum cliente com padrão de atraso identificado.</p>`;
        return;
    }

    el.innerHTML = lista.map(r => `
        <div class="dash-linha">
            <span class="nome">${r.pessoa.nome}</span>
            <span class="sub">costuma comprar a cada ${r.mediaDias}d, já são ${r.diasDesde}d</span>
        </div>
    `).join("");
}

/* ---------------------- Clientes mais fiéis ---------------------- */

function renderizarClientesFieis() {
    const el = document.querySelector("#lista-clientes-fieis");
    const porCliente = {};

    vendas.forEach(v => {
        v.responsaveis.forEach(id => {
            porCliente[id] = (porCliente[id] || 0) + 1;
        });
    });

    const top = Object.entries(porCliente)
        .map(([id, qtd]) => ({ pessoa: pessoaPorId(Number(id)), qtd }))
        .filter(x => x.pessoa)
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 8);

    if (top.length === 0) {
        el.innerHTML = `<p class="dash-vazio">Sem dados suficientes.</p>`;
        return;
    }

    const maxQtd = top[0].qtd;
    el.innerHTML = top.map(t => `
        <div class="dash-linha">
            <span class="nome">${t.pessoa.nome}</span>
            <div class="dash-barra-wrap"><div class="dash-barra" style="width:${(t.qtd / maxQtd) * 100}%;"></div></div>
            <span class="valor">${t.qtd}x</span>
        </div>
    `).join("");
}

/* ---------------------- Produtos mais vendidos (por receita) ---------------------- */

function calcularReceitaPorProduto() {
    const porProduto = {};
    vendas.forEach(v => {
        v.itens.forEach(i => {
            const receita = (i.preco_unitario || 0) * (i.quantidade || 0) * (1 - (i.desconto_percentual || 0) / 100);
            porProduto[i.produto_id] = (porProduto[i.produto_id] || 0) + receita;
        });
    });
    return porProduto;
}

function renderizarProdutosTop() {
    const el = document.querySelector("#lista-produtos-top");
    const porProduto = calcularReceitaPorProduto();

    const top = Object.entries(porProduto)
        .map(([id, receita]) => ({ produto: produtoPorId(Number(id)), receita }))
        .filter(x => x.produto)
        .sort((a, b) => b.receita - a.receita)
        .slice(0, 8);

    if (top.length === 0) {
        el.innerHTML = `<p class="dash-vazio">Sem vendas registradas ainda.</p>`;
        return;
    }

    const maxReceita = top[0].receita;
    el.innerHTML = top.map(t => `
        <div class="dash-linha">
            <span class="nome">${t.produto.descricao}</span>
            <div class="dash-barra-wrap"><div class="dash-barra" style="width:${(t.receita / maxReceita) * 100}%;"></div></div>
            <span class="valor">${formatarMoeda(t.receita)}</span>
        </div>
    `).join("");
}

/* ---------------------- Produtos parados (estoque alto, venda baixa) ---------------------- */

/* Regra: "parado" = estoque atual acima do estoque mínimo em pelo menos
   3x, E vendeu 2 unidades ou menos no histórico completo. Isso aponta
   capital empatado em produto que não gira — candidato a promoção ou a
   parar de comprar mais. */
function calcularProdutosParados() {
    const vendidoPorProduto = {};
    vendas.forEach(v => v.itens.forEach(i => {
        vendidoPorProduto[i.produto_id] = (vendidoPorProduto[i.produto_id] || 0) + i.quantidade;
    }));

    return produtos
        .filter(p => p.estoque_minimo > 0 && p.estoque >= p.estoque_minimo * 3 && (vendidoPorProduto[p.id] || 0) <= 2)
        .map(p => ({ produto: p, vendido: vendidoPorProduto[p.id] || 0 }))
        .sort((a, b) => b.produto.estoque - a.produto.estoque)
        .slice(0, 8);
}

function renderizarProdutosParados() {
    const el = document.querySelector("#lista-produtos-parados");
    const lista = calcularProdutosParados();

    if (lista.length === 0) {
        el.innerHTML = `<p class="dash-vazio">Nenhum produto parado identificado.</p>`;
        return;
    }

    el.innerHTML = lista.map(l => `
        <div class="dash-linha">
            <span class="nome">${l.produto.descricao}</span>
            <span class="sub">${l.produto.estoque}${l.produto.vendido_a_granel ? "kg" : "un"} em estoque · vendeu ${l.vendido} no total</span>
        </div>
    `).join("");
}

/* ---------------------- Estoque crítico ---------------------- */

function renderizarEstoqueCritico() {
    const el = document.querySelector("#lista-estoque-critico");
    const lista = produtos
        .filter(p => p.estoque <= p.estoque_minimo)
        .sort((a, b) => (a.estoque - a.estoque_minimo) - (b.estoque - b.estoque_minimo))
        .slice(0, 8);

    if (lista.length === 0) {
        el.innerHTML = `<p class="dash-vazio">Nenhum produto em estoque crítico.</p>`;
        return;
    }

    el.innerHTML = lista.map(p => `
        <div class="dash-linha">
            <span class="nome">${p.descricao}</span>
            <span class="sub">${p.estoque}${p.vendido_a_granel ? "kg" : "un"} (mín. ${p.estoque_minimo})</span>
        </div>
    `).join("");
}

/* ---------------------- Correlação espécie x categoria ---------------------- */

/* O que donos de cães vs. gatos mais compram, em receita — serve tanto
   para decidir compra de estoque direcionada quanto para embasar a
   sugestão automática de produto na tela de Venda (produtoMaisFrequente). */
function calcularCorrelacaoEspecieCategoria() {
    const porEspecieCategoria = {}; // { especie: { categoria: receita } }

    vendas.forEach(v => {
        const pet = petPorId(v.pet_id);
        if (!pet) return;
        v.itens.forEach(i => {
            const produto = produtoPorId(i.produto_id);
            if (!produto) return;
            const receita = (i.preco_unitario || 0) * (i.quantidade || 0) * (1 - (i.desconto_percentual || 0) / 100);
            porEspecieCategoria[pet.especie] = porEspecieCategoria[pet.especie] || {};
            porEspecieCategoria[pet.especie][produto.categoria] = (porEspecieCategoria[pet.especie][produto.categoria] || 0) + receita;
        });
    });

    return porEspecieCategoria;
}

function renderizarCorrelacao() {
    const el = document.querySelector("#tabela-correlacao");
    const dados = calcularCorrelacaoEspecieCategoria();
    const especies = Object.keys(dados);

    if (especies.length === 0) {
        el.innerHTML = `<p class="dash-vazio">Sem vendas suficientes para correlacionar espécie e categoria.</p>`;
        return;
    }

    const linhas = especies.map(especie => {
        const categorias = Object.entries(dados[especie]).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const top = categorias[0];
        return `
            <tr>
                <td>${especie === "Gato" ? "🐱" : "🐶"} ${especie}</td>
                <td class="destaque">${top ? top[0] : "-"}</td>
                <td>${categorias.map(c => `${c[0]} (${formatarMoeda(c[1])})`).join(", ")}</td>
            </tr>
        `;
    }).join("");

    el.innerHTML = `
        <table>
            <thead>
                <tr><th>Espécie</th><th>Categoria principal</th><th>Top 3 categorias por receita</th></tr>
            </thead>
            <tbody>${linhas}</tbody>
        </table>
    `;
}

/* ---------------------- Boot ---------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    await carregarDados();

    renderizarKPIs();
    renderizarVendasPorMes();
    renderizarClientesRisco();
    renderizarClientesFieis();
    renderizarProdutosTop();
    renderizarProdutosParados();
    renderizarEstoqueCritico();
    renderizarCorrelacao();
});
