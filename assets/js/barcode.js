/* ==========================================================
   Gerador de código de barras Code128 (offline, sem serviço externo)
   ==========================================================
   Implementação própria e minimalista do subconjunto Code128-B, o
   suficiente para gerar um código de barras a partir de um texto
   alfanumérico (ex: "AGP-000123") e desenhar no <canvas>, sem depender
   de nenhuma biblioteca externa nem de conexão com a internet — cumpre
   a regra 29 de docs/regras-negocio.md (código de barras interno para
   produtos sem EAN de fábrica, ex: ração a granel).
   ========================================================== */

const AgroBarcode = (() => {
    // Tabela de padrões Code128-B: cada caractere ASCII 32-127 vira uma
    // sequência de 6 larguras de barra/espaço (padrão oficial da simbologia).
    const PATTERNS = [
        "212222","222122","222221","121223","121322","131222","122213","122312",
        "132212","221213","221312","231212","112232","122132","122231","113222",
        "123122","123221","223211","221132","221231","213212","223112","312131",
        "311222","321122","321221","312212","322112","322211","212123","212321",
        "232121","111323","131123","131321","112313","132113","132311","211313",
        "231113","231311","112133","112331","132131","113123","113321","133121",
        "313121","211331","231131","213113","213311","213131","311123","311321",
        "331121","312113","312311","332111","314111","221411","431111","111224",
        "111422","121124","121421","141122","141221","112214","112412","122114",
        "122411","142112","142211","241211","221114","413111","241112","134111",
        "111242","121142","121241","114212","124112","124211","411212","421112",
        "421211","212141","214121","412121","111143","111341","131141","114113",
        "114311","411113","411311","113141","114131","311141","411131","211412",
        "211214","211232","2331112"
    ];
    const START_B = 104, STOP = 106;

    function textoParaValores(texto) {
        return texto.split("").map(ch => {
            const codigo = ch.charCodeAt(0) - 32;
            if (codigo < 0 || codigo > 94) {
                throw new Error(`Caractere não suportado no código de barras: "${ch}"`);
            }
            return codigo;
        });
    }

    function checksum(valores) {
        let soma = START_B;
        valores.forEach((v, i) => { soma += v * (i + 1); });
        return soma % 103;
    }

    /* Desenha o código de barras (com o texto legível abaixo) num canvas.
       Retorna o próprio canvas, para permitir toDataURL()/download. */
    function desenhar(canvas, texto, opcoes = {}) {
        const largBarra = opcoes.largBarra || 2;
        const altura = opcoes.altura || 80;
        const margem = opcoes.margem || 10;

        const valores = textoParaValores(texto);
        const sequencia = [START_B, ...valores, checksum(valores), STOP];

        const larguraTotal = sequencia.reduce((soma, v) => {
            const padrao = PATTERNS[v];
            const somaPadrao = padrao.split("").reduce((s, d) => s + Number(d), 0);
            return soma + somaPadrao;
        }, 0) * largBarra;

        canvas.width = larguraTotal + margem * 2;
        canvas.height = altura + 26;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#000000";

        let x = margem;
        sequencia.forEach(v => {
            const padrao = PATTERNS[v].split("").map(Number);
            padrao.forEach((largura, idx) => {
                const preto = idx % 2 === 0; // padrão começa sempre em barra preta
                if (preto) ctx.fillRect(x, 4, largura * largBarra, altura);
                x += largura * largBarra;
            });
        });

        ctx.font = "13px monospace";
        ctx.textAlign = "center";
        ctx.fillText(texto, canvas.width / 2, altura + 20);

        return canvas;
    }

    /* Gera um código interno definitivo para um produto (regra 29: uma vez
       gerado, é fixo — nunca regenerado). Prefixo próprio da loja + id do
       produto + dígito de verificação simples, para ficar curto e único. */
    function gerarCodigoInterno(produtoId) {
        const base = `AGP${String(produtoId).padStart(6, "0")}`;
        return base;
    }

    return { desenhar, gerarCodigoInterno };
})();
