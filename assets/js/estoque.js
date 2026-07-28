/* ==========================================================
   Estoque - AgroPets Gestão
   Movimentações de entrada/saída em lote (por validade — regra 31 de
   docs/regras-negocio.md), cadastro completo de produto novo com gavetas
   de campos secundários e geração de código de barras interno (regra 29).
   ========================================================== */

let produtos = [];
let movimentoIdCounter = 0;

async function carregarProdutos() {
    const dados = await AgroStore.carregarColecao("produtos", "../assets/data/produtos.json");
    produtos = dados;
}

function persistirProdutos() {
    AgroStore.salvar("produtos", produtos);
}

function normalizar(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/* Regra 30: aceita busca tanto por descrição quanto por código/EAN, para
   reconhecer bipagem de leitor óptico. */
function buscarProdutos(texto) {
    const busca = normalizar(texto);
    if (busca.length === 0) return [];
    return produtos
        .filter(p => normalizar(p.descricao).includes(busca)
            || normalizar(p.codigo || "").includes(busca)
            || normalizar(p.bling_extra?.gtin_ean || "").includes(busca))
        .sort((a, b) => normalizar(b.descricao).startsWith(busca) - normalizar(a.descricao).startsWith(busca))
        .slice(0, 8);
}

function produtoPorCodigoExato(texto) {
    const busca = normalizar(texto);
    if (busca.length < 3) return null;
    return produtos.find(p =>
        normalizar(p.codigo || "") === busca ||
        normalizar(p.bling_extra?.gtin_ean || "") === busca
    ) || null;
}

function produtoPorId(id) {
    return produtos.find(p => p.id === id);
}

/* ---------------------- Renderização do estoque atual ---------------------- */

function renderizarEstoqueAtual(filtro) {
    const el = document.querySelector("#lista-estoque-atual");
    const busca = normalizar(filtro || "");
    const lista = busca
        ? produtos.filter(p => normalizar(p.descricao).includes(busca) || normalizar(p.codigo || "").includes(busca))
        : produtos.slice().sort((a, b) => a.descricao.localeCompare(b.descricao));

    if (lista.length === 0) {
        el.innerHTML = `<p class="resumo-vazio">Nenhum produto encontrado.</p>`;
        return;
    }

    el.innerHTML = lista.slice(0, 60).map(p => {
        AgroLotes.garantirLotes(p);
        const baixo = p.estoque <= p.estoque_minimo;
        const unidadeTxt = p.vendido_a_granel ? "kg" : "un";
        const lotesComValidade = p.lotes.filter(l => l.validade);
        const proximaValidade = lotesComValidade.length
            ? lotesComValidade.sort((a, b) => a.validade < b.validade ? -1 : 1)[0].validade
            : null;
        const validadeTxt = proximaValidade ? ` · validade mais próxima: ${proximaValidade}` : "";

        return `
            <div class="item-estoque">
                <strong>${p.descricao}</strong>
                <small class="${baixo ? "estoque-baixo" : ""}">
                    ${p.estoque}${unidadeTxt} em estoque${baixo ? " ⚠ estoque baixo" : ""} · ${p.codigo}${validadeTxt}
                </small>
            </div>
        `;
    }).join("");
}

/* ---------------------- Blocos de movimento ---------------------- */

function ligarAutocompleteProduto(item, campoProduto, areaSug) {
    campoProduto.addEventListener("input", () => {
        item.dataset.produtoId = "";
        const resultado = buscarProdutos(campoProduto.value);
        areaSug.innerHTML = "";

        if (resultado.length === 0) {
            areaSug.classList.remove("aberto");
            return;
        }

        resultado.forEach(prod => {
            const div = document.createElement("div");
            div.classList.add("sugestao");
            const estoqueTxt = prod.vendido_a_granel ? `${prod.estoque}kg em estoque` : `${prod.estoque} un em estoque`;
            div.innerHTML = `<strong>${prod.descricao}</strong><br><small>${prod.codigo} · ${estoqueTxt}</small>`;
            div.onclick = () => {
                campoProduto.value = prod.descricao;
                item.dataset.produtoId = prod.id;
                areaSug.classList.remove("aberto");
            };
            areaSug.appendChild(div);
        });

        areaSug.classList.add("aberto");
    });

    // Regra 30: bipagem — Enter com código/EAN exato aplica direto, sem
    // precisar abrir a lista de sugestões.
    campoProduto.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const prod = produtoPorCodigoExato(campoProduto.value);
        if (prod) {
            campoProduto.value = prod.descricao;
            item.dataset.produtoId = prod.id;
            areaSug.classList.remove("aberto");
            e.preventDefault();
        }
    });

    campoProduto.addEventListener("blur", () => {
        setTimeout(() => areaSug.classList.remove("aberto"), 150);
    });
}

function criarBlocoEntrada() {
    movimentoIdCounter++;
    const tpl = document.querySelector("#tpl-movimento-entrada");
    const clone = tpl.content.cloneNode(true);
    const item = clone.querySelector(".movimento-item");
    item.dataset.produtoId = "";
    item.dataset.tipo = "entrada";

    const campoProduto = item.querySelector(".mov-produto");
    const areaSug = item.querySelector(".mov-sugestoes-produto");
    ligarAutocompleteProduto(item, campoProduto, areaSug);

    item.querySelector(".remover-movimento").onclick = () => item.remove();

    document.querySelector("#lista-movimentos").appendChild(clone);
}

function criarBlocoSaida() {
    movimentoIdCounter++;
    const tpl = document.querySelector("#tpl-movimento-saida");
    const clone = tpl.content.cloneNode(true);
    const item = clone.querySelector(".movimento-item");
    item.dataset.produtoId = "";
    item.dataset.tipo = "saida";

    const campoProduto = item.querySelector(".mov-produto");
    const areaSug = item.querySelector(".mov-sugestoes-produto");
    ligarAutocompleteProduto(item, campoProduto, areaSug);

    item.querySelector(".remover-movimento").onclick = () => item.remove();

    document.querySelector("#lista-movimentos").appendChild(clone);
}

/* ---------------------- Cadastro de produto novo (regra 33) ----------------------
   Usado quando o vendedor bipa ou digita algo que não bate com nenhum
   produto já cadastrado — cadastro manual completo, com os campos
   secundários em gaveta (fiscal, logística, código de barras interno). */

let formProdutoNovoAtivo = null;

function abrirCadastroProdutoNovo(nomeSugerido) {
    const area = document.querySelector("#cadastro-produto-novo");
    const container = document.querySelector("#produto-novo-form-container");
    area.style.display = "block";

    formProdutoNovoAtivo = AgroProdutoForm.criar(container, nomeSugerido ? { descricao: nomeSugerido } : null, {
        produtoId: AgroStore.proximoId(produtos),
    });

    area.scrollIntoView({ behavior: "smooth", block: "start" });
}

function fecharCadastroProdutoNovo() {
    document.querySelector("#cadastro-produto-novo").style.display = "none";
    formProdutoNovoAtivo = null;
}

function confirmarCadastroProdutoNovo() {
    if (!formProdutoNovoAtivo) return;
    const { valido, erro, produto } = formProdutoNovoAtivo.coletar();

    if (!valido) {
        alert(erro);
        return;
    }

    produto.id = AgroStore.proximoId(produtos);
    if (!produto.codigo) {
        produto.codigo = `AGP${String(produto.id).padStart(4, "0")}`;
    }
    produto.lotes = [];

    produtos.push(produto);
    persistirProdutos();

    fecharCadastroProdutoNovo();
    renderizarEstoqueAtual(document.querySelector("#busca-estoque").value);

    const msg = document.querySelector("#msg-sucesso-estoque");
    msg.style.display = "block";
    msg.innerHTML = `✔ Produto "${produto.descricao}" cadastrado. Agora você pode dar entrada no estoque dele em "Movimentar Estoque".`;
}

/* ---------------------- Modal de motivo ---------------------- */

function perguntarMotivo(nomeProduto) {
    return new Promise(resolve => {
        const overlay = document.querySelector("#modal-motivo");
        const produtoEl = document.querySelector("#modal-motivo-produto");
        const select = document.querySelector("#modal-motivo-select");
        const outroInput = document.querySelector("#modal-motivo-outro");
        const btnConfirmar = document.querySelector("#modal-motivo-confirmar");

        produtoEl.textContent = `Por que "${nomeProduto}" está sendo removido do estoque?`;
        select.value = "outro";
        outroInput.value = "";
        outroInput.style.display = "none";
        overlay.style.display = "flex";

        select.onchange = () => {
            outroInput.style.display = select.value === "outro" ? "block" : "none";
        };

        btnConfirmar.onclick = () => {
            const motivo = select.value === "outro" && outroInput.value.trim()
                ? outroInput.value.trim()
                : select.value;
            overlay.style.display = "none";
            resolve(motivo);
        };
    });
}

/* Regra de estoque (docs/regras-negocio.md): se a validade informada já
   passou, o motivo é inferido automaticamente como "venceu" sem perguntar
   nada — só perguntamos quando não há como deduzir o motivo. */
function motivoAutomaticoPorValidade(validade) {
    if (!validade) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataValidade = new Date(validade + "T00:00:00");
    return dataValidade < hoje ? "venceu" : null;
}

const LABELS_MOTIVO = {
    venceu: "Venceu / vencendo",
    quebrou: "Quebrou / avariou",
    devolucao: "Devolução ao fornecedor",
    perda: "Perda / extravio",
    ajuste: "Ajuste de contagem",
    outro: "Outro",
};

/* Regra 31: entrada sempre cria um lote novo (com ou sem validade); saída
   sempre consome por FIFO de validade, nunca decrementa um contador
   genérico — importante para saber exatamente qual lote saiu. */
async function atualizarEstoque() {
    const movimentos = Array.from(document.querySelectorAll(".movimento-item"));
    if (movimentos.length === 0) {
        alert("Adicione ao menos um item antes de atualizar o estoque.");
        return;
    }

    const resultados = [];

    for (const item of movimentos) {
        const produtoId = Number(item.dataset.produtoId);
        const nomeDigitado = item.querySelector(".mov-produto").value.trim();
        const qtd = parseFloat(item.querySelector(".mov-qtd").value) || 0;
        const produto = produtoId ? produtoPorId(produtoId) : null;

        if (!nomeDigitado || qtd <= 0) continue;

        if (!produto) {
            resultados.push(`⚠ "${nomeDigitado}" não corresponde a um produto cadastrado — use "Cadastrar produto novo" antes de dar entrada.`);
            continue;
        }

        if (item.dataset.tipo === "entrada") {
            const validade = item.querySelector(".mov-validade")?.value || null;
            AgroLotes.adicionarLote(produto, qtd, validade);
            const validadeTxt = validade ? ` (validade ${validade})` : "";
            resultados.push(`+ ${qtd} ${produto.vendido_a_granel ? "kg" : "un"} de ${produto.descricao}${validadeTxt}`);
        } else {
            // Saída: tenta deduzir o motivo automaticamente pela validade;
            // se não for possível, e o motivo não foi escolhido no select,
            // pergunta ao usuário (uma vez por item pendente).
            const validadeDigitada = item.querySelector(".mov-validade")?.value || "";
            let motivo = motivoAutomaticoPorValidade(validadeDigitada);

            if (!motivo) {
                const selecionado = item.querySelector(".mov-motivo")?.value || "";
                motivo = selecionado || await perguntarMotivo(nomeDigitado || produto.descricao);
            }

            const { afetados, faltou } = AgroLotes.consumirFIFO(produto, qtd);
            const detalheLotes = afetados
                .map(a => `${a.quantidade}${produto.vendido_a_granel ? "kg" : "un"}${a.validade ? ` (val. ${a.validade})` : " (sem validade registrada)"}`)
                .join(", ");

            const motivoLabel = LABELS_MOTIVO[motivo] || motivo;
            const faltaTxt = faltou > 0 ? ` — atenção: faltaram ${faltou} no estoque, ficou negativo/zerado.` : "";
            resultados.push(`− ${qtd} ${produto.vendido_a_granel ? "kg" : "un"} de ${produto.descricao} (motivo: ${motivoLabel}) — lote(s) afetado(s): ${detalheLotes || "nenhum (estoque já estava vazio)"}${faltaTxt}`);
        }
    }

    persistirProdutos();

    const msg = document.querySelector("#msg-sucesso-estoque");
    msg.style.display = "block";
    msg.innerHTML = `✔ Estoque atualizado:<br>${resultados.join("<br>")}`;

    document.querySelector("#lista-movimentos").innerHTML = "";
    renderizarEstoqueAtual(document.querySelector("#busca-estoque").value);
}

/* ---------------------- Boot ---------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    await carregarProdutos();

    criarBlocoEntrada();
    renderizarEstoqueAtual("");

    document.querySelector("#btn-add-entrada").onclick = criarBlocoEntrada;
    document.querySelector("#btn-add-saida").onclick = criarBlocoSaida;
    document.querySelector("#btn-atualizar-estoque").onclick = atualizarEstoque;

    document.querySelector("#btn-cadastrar-produto-novo").onclick = () => abrirCadastroProdutoNovo();
    document.querySelector("#btn-cancelar-produto-novo").onclick = fecharCadastroProdutoNovo;
    document.querySelector("#btn-confirmar-produto-novo").onclick = confirmarCadastroProdutoNovo;

    document.querySelector("#busca-estoque").addEventListener("input", (e) => {
        renderizarEstoqueAtual(e.target.value);
    });
});
