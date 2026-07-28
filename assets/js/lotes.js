/* ==========================================================
   Controle de estoque por lote (regra 31 de docs/regras-negocio.md)
   ==========================================================
   A quantidade que aparece na tela (ex: "Qtd: 2") nunca corresponde a uma
   baixa agregada e genérica no estoque — por trás, cada produto guarda
   lotes específicos (cada um com sua própria validade), e o consumo
   segue FIFO por data de validade: o lote que vence mais cedo é
   consumido primeiro. Produtos que ainda não têm o array `lotes`
   (produtos antigos do catálogo de simulação) são migrados de forma
   automática e transparente: assume-se um único lote implícito, do
   tamanho do campo `estoque` atual, sem validade.
   ========================================================== */

const AgroLotes = (() => {

    let loteIdCounter = Date.now();

    /* Garante que o produto tenha um array `lotes` coerente com o campo
       `estoque` legado. Chamado sempre antes de ler/alterar lotes. */
    function garantirLotes(produto) {
        if (!Array.isArray(produto.lotes)) {
            produto.lotes = [];
            if (produto.estoque > 0) {
                produto.lotes.push({
                    id: ++loteIdCounter,
                    quantidade: produto.estoque,
                    validade: null,
                });
            }
        }
        return produto.lotes;
    }

    /* Soma de todos os lotes — é o valor que deve ficar espelhado em
       produto.estoque para não quebrar as telas que já leem esse campo
       diretamente (regra de compatibilidade). */
    function totalLotes(produto) {
        return garantirLotes(produto).reduce((soma, l) => soma + l.quantidade, 0);
    }

    function sincronizarEstoque(produto) {
        produto.estoque = Math.round(totalLotes(produto) * 100) / 100;
        return produto.estoque;
    }

    /* Entrada: cria um novo lote. Se a validade não for informada, o lote
       fica sem validade (nunca vence automaticamente). */
    function adicionarLote(produto, quantidade, validade) {
        const lotes = garantirLotes(produto);
        lotes.push({
            id: ++loteIdCounter,
            quantidade: Math.round(quantidade * 100) / 100,
            validade: validade || null,
        });
        sincronizarEstoque(produto);
        return lotes[lotes.length - 1];
    }

    /* Saída: consome `quantidade` a partir dos lotes existentes, sempre
       priorizando o lote que vence mais cedo (nulls — sem validade — vão
       para o final, por serem considerados "sem prazo"). Retorna a lista
       de lotes efetivamente afetados (para exibir/registrar qual lote
       específico saiu), e não deixa quantidade residual negativa. */
    function consumirFIFO(produto, quantidade) {
        const lotes = garantirLotes(produto);
        lotes.sort((a, b) => {
            if (a.validade && b.validade) return a.validade < b.validade ? -1 : 1;
            if (a.validade && !b.validade) return -1;
            if (!a.validade && b.validade) return 1;
            return 0;
        });

        let restante = Math.round(quantidade * 100) / 100;
        const afetados = [];

        for (const lote of lotes) {
            if (restante <= 0) break;
            if (lote.quantidade <= 0) continue;
            const consumidoDoLote = Math.min(lote.quantidade, restante);
            lote.quantidade = Math.round((lote.quantidade - consumidoDoLote) * 100) / 100;
            restante = Math.round((restante - consumidoDoLote) * 100) / 100;
            afetados.push({ loteId: lote.id, validade: lote.validade, quantidade: consumidoDoLote });
        }

        // Remove lotes zerados para não acumular lixo.
        produto.lotes = lotes.filter(l => l.quantidade > 0);
        sincronizarEstoque(produto);

        return { afetados, faltou: Math.max(restante, 0) };
    }

    return { garantirLotes, totalLotes, sincronizarEstoque, adicionarLote, consumirFIFO };
})();
