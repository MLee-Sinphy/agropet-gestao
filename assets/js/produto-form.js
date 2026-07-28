/* ==========================================================
   Formulário reutilizável de Produto (regras 23, 27, 29, 33 e
   melhorias-pendentes.md #6 — grupos de campos do produto)
   ==========================================================
   Usado tanto em Estoque (ao cadastrar um produto novo, não reconhecido
   por nenhuma base) quanto em Gerenciar/Cadastros (edição completa de um
   produto já existente). Sempre expõe TODOS os campos possíveis — os
   secundários dentro de gavetas fechadas por padrão, mas nunca travados.

   Uso:
     const form = AgroProdutoForm.criar(container, produtoExistente);
     ... usuário edita ...
     const { valido, erro, produto } = form.coletar();
   ========================================================== */

const AgroProdutoForm = (() => {

    function html(produto) {
        const p = produto || {};
        const granel = p.vendido_a_granel ? "checked" : "";
        return `
        <div class="produto-form-grid">
            <div class="input-group">
                <label>Descrição *</label>
                <input type="text" class="pf-descricao" value="${p.descricao || ""}" placeholder="Ex: Ração Golden 15kg">
            </div>

            <div class="input-group">
                <label>Código interno</label>
                <input type="text" class="pf-codigo" value="${p.codigo || ""}" placeholder="Gerado automaticamente se vazio">
            </div>

            <div class="input-group">
                <label>Categoria</label>
                <input type="text" class="pf-categoria" value="${p.categoria || ""}">
            </div>

            <div class="input-group">
                <label>Marca</label>
                <input type="text" class="pf-marca" value="${p.marca || ""}">
            </div>

            <div class="input-group">
                <label>Fornecedor</label>
                <input type="text" class="pf-fornecedor" value="${p.fornecedor || ""}">
            </div>

            <div class="input-group pf-granel-wrap">
                <label>Vendido a granel (por peso, não por unidade fechada)</label>
                <select class="pf-granel">
                    <option value="nao" ${!p.vendido_a_granel ? "selected" : ""}>Não — unidade/saco fechado</option>
                    <option value="sim" ${p.vendido_a_granel ? "selected" : ""}>Sim — vendido a granel (kg)</option>
                </select>
            </div>

            <div class="input-group">
                <label class="pf-peso-label">Peso por unidade (kg) — opcional</label>
                <input type="number" class="pf-peso" step="0.01" min="0" value="${p.peso_kg_por_unidade ?? ""}">
            </div>

            <div class="input-group">
                <label>Preço de venda (R$) *</label>
                <input type="number" class="pf-preco" step="0.01" min="0" value="${p.preco ?? ""}">
            </div>

            <div class="input-group">
                <label>Estoque mínimo</label>
                <input type="number" class="pf-estoque-min" step="0.01" min="0" value="${p.estoque_minimo ?? 0}">
            </div>

            <div class="input-group">
                <label>Estoque máximo (opcional — alerta de excesso)</label>
                <input type="number" class="pf-estoque-max" step="0.01" min="0" value="${p.estoque_maximo ?? ""}">
            </div>

            <div class="input-group pf-full">
                <label>Observações</label>
                <input type="text" class="pf-observacoes" value="${p.observacoes || ""}">
            </div>
        </div>

        <details class="campos-gaveta">
            <summary>Dados fiscais (NCM, origem, EAN, custo)</summary>
            <div class="produto-form-grid">
                <div class="input-group">
                    <label>NCM</label>
                    <input type="text" class="pf-ncm" value="${p.bling_extra?.ncm || ""}" placeholder="Obrigatório para NFe">
                </div>
                <div class="input-group">
                    <label>Origem</label>
                    <input type="text" class="pf-origem" value="${p.bling_extra?.origem || ""}" placeholder="0 = Nacional, 1 = Importado...">
                </div>
                <div class="input-group">
                    <label>GTIN / EAN (código de barras de fábrica)</label>
                    <input type="text" class="pf-ean" value="${p.bling_extra?.gtin_ean || ""}" placeholder="Deixe vazio se não tiver">
                </div>
                <div class="input-group">
                    <label>Preço de custo (R$)</label>
                    <input type="number" step="0.01" min="0" class="pf-preco-custo" value="${p.bling_extra?.preco_custo ?? ""}">
                </div>
            </div>
        </details>

        <details class="campos-gaveta">
            <summary>Logística e detalhes (baixa frequência de uso)</summary>
            <div class="produto-form-grid">
                <div class="input-group">
                    <label>Peso bruto (kg)</label>
                    <input type="number" step="0.01" min="0" class="pf-peso-bruto" value="${p.bling_extra?.peso_bruto_kg ?? ""}">
                </div>
                <div class="input-group">
                    <label>Peso líquido (kg)</label>
                    <input type="number" step="0.01" min="0" class="pf-peso-liquido" value="${p.bling_extra?.peso_liquido_kg ?? ""}">
                </div>
                <div class="input-group">
                    <label>Dimensões (LxAxP, cm)</label>
                    <input type="text" class="pf-dimensoes" value="${p.bling_extra?.dimensoes || ""}" placeholder="Ex: 20x30x15">
                </div>
                <div class="input-group">
                    <label>Localização física na loja</label>
                    <input type="text" class="pf-localizacao" value="${p.bling_extra?.localizacao || ""}" placeholder="Ex: Corredor 3, Prateleira B">
                </div>
                <div class="input-group">
                    <label>CEST</label>
                    <input type="text" class="pf-cest" value="${p.bling_extra?.cest || ""}">
                </div>
                <div class="input-group">
                    <label>Tags/Grupo</label>
                    <input type="text" class="pf-tags" value="${p.bling_extra?.tags || ""}">
                </div>
            </div>
        </details>

        <details class="campos-gaveta pf-barcode-gaveta">
            <summary>Código de barras interno (para produtos sem EAN de fábrica, ex: a granel)</summary>
            <div class="pf-barcode-area">
                <p class="pf-barcode-ajuda">
                    Gere um código de barras próprio para produtos que não vêm com
                    código de fábrica (ex: ração a granel). Uma vez gerado, o código
                    é definitivo para este produto — use "Reimprimir" para obter a
                    mesma etiqueta de novo.
                </p>
                <div class="pf-barcode-preview"></div>
                <div class="pf-barcode-acoes">
                    <button type="button" class="secondary pf-btn-gerar-barcode">Gerar código de barras</button>
                    <button type="button" class="secondary pf-btn-baixar-barcode" style="display:none;">Baixar imagem</button>
                </div>
            </div>
        </details>
        `;
    }

    function criar(container, produtoExistente, opcoes = {}) {
        container.innerHTML = html(produtoExistente);
        container.classList.add("produto-form");

        const campoGranel = container.querySelector(".pf-granel");
        const campoPeso = container.querySelector(".pf-peso");
        const labelPeso = container.querySelector(".pf-peso-label");

        function ajustarLabelPeso() {
            const granel = campoGranel.value === "sim";
            labelPeso.textContent = granel
                ? "Peso vendido por padrão (kg) — opcional"
                : "Peso por unidade (kg) — opcional";
        }
        campoGranel.addEventListener("change", ajustarLabelPeso);
        ajustarLabelPeso();

        // --- código de barras interno ---
        const codigoBarrasAtual = { valor: produtoExistente?.bling_extra?.codigo_barras_interno || null };
        const preview = container.querySelector(".pf-barcode-preview");
        const btnGerar = container.querySelector(".pf-btn-gerar-barcode");
        const btnBaixar = container.querySelector(".pf-btn-baixar-barcode");

        function renderizarBarcode(codigo) {
            preview.innerHTML = "";
            const canvas = document.createElement("canvas");
            preview.appendChild(canvas);
            AgroBarcode.desenhar(canvas, codigo);
            btnGerar.textContent = "Reimprimir (gerar de novo o mesmo código)";
            btnBaixar.style.display = "inline-block";
            btnBaixar.onclick = () => {
                const link = document.createElement("a");
                link.download = `codigo-barras-${codigo}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
            };
        }

        if (codigoBarrasAtual.valor) {
            renderizarBarcode(codigoBarrasAtual.valor);
        }

        btnGerar.onclick = () => {
            if (!codigoBarrasAtual.valor) {
                const idBase = opcoes.produtoId || Date.now() % 1000000;
                codigoBarrasAtual.valor = AgroBarcode.gerarCodigoInterno(idBase);
            }
            renderizarBarcode(codigoBarrasAtual.valor);
        };

        function coletar() {
            const descricao = container.querySelector(".pf-descricao").value.trim();
            const precoTxt = container.querySelector(".pf-preco").value;
            const preco = parseFloat(precoTxt);

            if (!descricao) {
                return { valido: false, erro: "Descrição do produto é obrigatória." };
            }
            if (precoTxt === "" || isNaN(preco) || preco < 0) {
                return { valido: false, erro: "Preço de venda é obrigatório (regra 27 de docs/regras-negocio.md)." };
            }

            const granel = container.querySelector(".pf-granel").value === "sim";
            const pesoTxt = container.querySelector(".pf-peso").value;

            const produto = {
                id: produtoExistente?.id,
                codigo: container.querySelector(".pf-codigo").value.trim() || produtoExistente?.codigo || null,
                descricao,
                vendido_a_granel: granel,
                unidade_venda: granel ? "kg" : "un",
                peso_kg_por_unidade: pesoTxt !== "" ? parseFloat(pesoTxt) : null,
                preco,
                estoque: produtoExistente?.estoque ?? 0,
                estoque_minimo: parseFloat(container.querySelector(".pf-estoque-min").value) || 0,
                estoque_maximo: container.querySelector(".pf-estoque-max").value !== ""
                    ? parseFloat(container.querySelector(".pf-estoque-max").value) : null,
                fornecedor: container.querySelector(".pf-fornecedor").value.trim(),
                categoria: container.querySelector(".pf-categoria").value.trim(),
                marca: container.querySelector(".pf-marca").value.trim(),
                observacoes: container.querySelector(".pf-observacoes").value.trim(),
                lotes: produtoExistente?.lotes,
                bling_extra: {
                    ncm: container.querySelector(".pf-ncm").value.trim(),
                    origem: container.querySelector(".pf-origem").value.trim(),
                    gtin_ean: container.querySelector(".pf-ean").value.trim(),
                    preco_custo: container.querySelector(".pf-preco-custo").value !== ""
                        ? parseFloat(container.querySelector(".pf-preco-custo").value) : null,
                    peso_bruto_kg: container.querySelector(".pf-peso-bruto").value !== ""
                        ? parseFloat(container.querySelector(".pf-peso-bruto").value) : null,
                    peso_liquido_kg: container.querySelector(".pf-peso-liquido").value !== ""
                        ? parseFloat(container.querySelector(".pf-peso-liquido").value) : null,
                    dimensoes: container.querySelector(".pf-dimensoes").value.trim(),
                    localizacao: container.querySelector(".pf-localizacao").value.trim(),
                    cest: container.querySelector(".pf-cest").value.trim(),
                    tags: container.querySelector(".pf-tags").value.trim(),
                    codigo_barras_interno: codigoBarrasAtual.valor,
                },
            };

            return { valido: true, produto };
        }

        return { coletar };
    }

    return { criar };
})();
