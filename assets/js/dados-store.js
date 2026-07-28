/* ==========================================================
   Camada de persistência local (protótipo sem backend real)
   ==========================================================
   O projeto não tem servidor/banco de dados — os arquivos em
   assets/data/*.json são a base "de fábrica". Este módulo carrega essa
   base e aplica por cima qualquer alteração feita durante o uso da
   página, guardada no localStorage do navegador (mesma técnica já usada
   para o rascunho de venda). Assim, uma alteração feita em Estoque ou em
   Gerenciar aparece também em Venda e em Inteligência, sem precisar de
   backend — tudo dentro do mesmo navegador/perfil.

   Uso típico numa página:
     const dados = await AgroStore.carregarTudo("../assets/data/");
     // dados.pessoas, dados.pets, dados.produtos, dados.vendas
     ... altera algo em dados.produtos ...
     AgroStore.salvar("produtos", dados.produtos);
   ========================================================== */

const AgroStore = (() => {
    const KEYS = {
        pessoas: "agropet_pessoas",
        pets: "agropet_pets",
        produtos: "agropet_produtos",
        vendas: "agropet_vendas",
    };

    function lerOverlay(chave) {
        try {
            const raw = localStorage.getItem(chave);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function salvarOverlay(chave, dados) {
        try {
            localStorage.setItem(chave, JSON.stringify(dados));
        } catch (e) {
            /* localStorage indisponível: ignora silenciosamente */
        }
    }

    async function carregarColecao(nome, caminho) {
        const overlay = lerOverlay(KEYS[nome]);
        if (overlay) return overlay;
        const r = await fetch(caminho);
        return await r.json();
    }

    async function carregarTudo(prefixoCaminho) {
        const [pessoas, pets, produtos, vendas] = await Promise.all([
            carregarColecao("pessoas", `${prefixoCaminho}pessoas.json`),
            carregarColecao("pets", `${prefixoCaminho}pets.json`),
            carregarColecao("produtos", `${prefixoCaminho}produtos.json`),
            carregarColecao("vendas", `${prefixoCaminho}vendas.json`),
        ]);
        return { pessoas, pets, produtos, vendas };
    }

    function salvar(nome, dados) {
        salvarOverlay(KEYS[nome], dados);
    }

    /* Remove todas as alterações locais e volta aos arquivos JSON originais
       (útil para "resetar" a demonstração/protótipo). */
    function limparTudo() {
        Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    }

    function proximoId(lista) {
        return lista.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
    }

    return { carregarTudo, carregarColecao, salvar, limparTudo, proximoId, KEYS };
})();
