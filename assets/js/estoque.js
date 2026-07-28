/* ==========================================================
   Estoque - AgroPets Gestão
   Movimentações de entrada/saída em lote, com detecção automática de
   validade vencida e pergunta de motivo apenas quando necessário.
   Ver docs/regras-negocio.md (seção Estoque) para as regras completas.
   ========================================================== */

let produtos = [];
let movimentoIdCounter = 0;

async function carregarProdutos() {
    const r = await fetch("../assets/data/produtos.json");
    produtos = await r.json();
}

function normalizar(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function buscarProdutos(texto) {
    const busca = normalizar(texto);
    if (busca.length === 0) return [];
    return produtos
        .filter(p => normalizar(p.descricao).includes(busca))
        .sort((a, b) => normalizar(b.descricao).startsWith(busca) - normalizar(a.descricao).startsWith(busca))
        .slice(0, 8);
}

function produtoPorId(id) {
    return produtos.find(p => p.id === id);
}

/* ---------------------- Renderização do estoque atual ---------------------- */

function renderizarEstoqueAtual(filtro) {
    const el = document.querySelector("#lista-estoque-atual");
    const busca = normalizar(filtro || "");
    const lista = busca
        ? produtos.filter(p => normalizar(p.descricao).includes(busca))
        : produtos.slice().sort((a, b) => a.descricao.localeCompare(b.descricao));

    if (lista.length === 0) {
        el.innerHTML = `<p class="resumo-vazio">Nenhum produto encontrado.</p>`;
        return;
    }

    el.innerHTML = lista.slice(0, 60).map(p => {
        const baixo = p.estoque <= p.estoque_minimo;
        const unidadeTxt = p.vendido_a_granel ? "kg" : "un";
        return `
            <div class="item-estoque">
                <strong>${p.descricao}</strong>
                <small class="${baixo ? "estoque-baixo" : ""}">
                    ${p.estoque}${unidadeTxt} em estoque${baixo ? " ⚠ estoque baixo" : ""} · ${p.codigo}
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

        if (item.dataset.tipo === "entrada") {
            if (produto) {
                produto.estoque = Math.round((produto.estoque + qtd) * 100) / 100;
            }
            resultados.push(`+ ${qtd} ${produto?.vendido_a_granel ? "kg" : "un"} de ${nomeDigitado}`);
        } else {
            // Saída: tenta deduzir o motivo automaticamente pela validade;
            // se não for possível, e o motivo não foi escolhido no select,
            // pergunta ao usuário (uma vez por item pendente).
            const validade = item.querySelector(".mov-validade")?.value || "";
            let motivo = motivoAutomaticoPorValidade(validade);

            if (!motivo) {
                const selecionado = item.querySelector(".mov-motivo")?.value || "";
                motivo = selecionado || await perguntarMotivo(nomeDigitado || produto?.descricao || "item");
            }

            if (produto) {
                produto.estoque = Math.round((produto.estoque - qtd) * 100) / 100;
                if (produto.estoque < 0) produto.estoque = 0;
            }

            const motivoLabel = LABELS_MOTIVO[motivo] || motivo;
            resultados.push(`− ${qtd} ${produto?.vendido_a_granel ? "kg" : "un"} de ${nomeDigitado} (motivo: ${motivoLabel})`);
        }
    }

    const msg = document.querySelector("#msg-sucesso-estoque");
    msg.style.display = "block";
    msg.innerHTML = `✔ Estoque atualizado (protótipo, sem persistência real):<br>${resultados.join("<br>")}`;

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

    document.querySelector("#busca-estoque").addEventListener("input", (e) => {
        renderizarEstoqueAtual(e.target.value);
    });
});
