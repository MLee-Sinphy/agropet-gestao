/* ==========================================================
   Venda - AgroPets Gestão
   Autocomplete, resumo dinâmico, desambiguação de pets homônimos,
   múltiplos responsáveis por venda, forma de atendimento, desconto por
   item, bipagem de código de barras/EAN e persistência de rascunho
   (regras completas em docs/regras-negocio.md, especialmente 27-31).
   ========================================================== */

let pessoas = [];
let pets = [];
let produtos = [];
let vendas = [];

let productIdCounter = 0;
const DRAFT_KEY = "agropet_venda_draft";

async function carregarDados() {
    const dados = await AgroStore.carregarTudo("../assets/data/");
    pessoas = dados.pessoas;
    pets = dados.pets;
    produtos = dados.produtos;
    vendas = dados.vendas;
}

function normalizar(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function pessoaPorId(id) {
    return pessoas.find(p => p.id === id);
}

function petPorId(id) {
    return pets.find(p => p.id === id);
}

/* IDs de todos os responsáveis já escolhidos em qualquer bloco da venda. */
function responsaveisAtuaisIds() {
    return Array.from(document.querySelectorAll(".responsavel-item"))
        .map(item => Number(item.dataset.pessoaId))
        .filter(id => !!id);
}

function responsaveisAtuais() {
    return responsaveisAtuaisIds().map(pessoaPorId).filter(Boolean);
}

/* ---------------------- Rascunho (persistência local) ----------------------
   Regra nova (ver docs/regras-negocio.md #20): se a página recarregar sem
   querer, os campos já preenchidos não devem se perder. Salvamos o estado
   da venda em andamento no localStorage e restauramos ao carregar. */

function coletarEstadoVenda() {
    const responsaveis = Array.from(document.querySelectorAll(".responsavel-item")).map(item => ({
        pessoaId: item.dataset.pessoaId || "",
        nome: item.querySelector(".resp-nome")?.value || "",
        telefone: item.querySelector(".resp-telefone")?.value || "",
        cep: item.querySelector(".resp-cep")?.value || "",
        rua: item.querySelector(".resp-rua")?.value || "",
        numero: item.querySelector(".resp-numero")?.value || "",
        cidade: item.querySelector(".resp-cidade")?.value || "",
    }));

    const produtosForm = Array.from(document.querySelectorAll(".produto-item")).map(item => ({
        produtoId: item.dataset.produtoId || "",
        petId: item.dataset.petId || "",
        nomeProduto: item.querySelector(".prod-nome")?.value || "",
        nomePet: item.querySelector(".prod-pet")?.value || "",
        quantidade: item.querySelector(".prod-qtd")?.value || "",
        tipoQuantidade: item.querySelector(".flip-switch")?.dataset.value || "unidade",
        desconto: item.querySelector(".prod-desconto")?.value || "0",
    }));

    const atendimentoEl = document.querySelector("#atendimentoSwitch");

    return {
        responsaveis,
        produtos: produtosForm,
        formaAtendimento: atendimentoEl ? atendimentoEl.dataset.value : "presencial",
    };
}

function salvarRascunho() {
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(coletarEstadoVenda()));
    } catch (e) { /* localStorage indisponível: ignora silenciosamente */ }
}

function limparRascunho() {
    localStorage.removeItem(DRAFT_KEY);
}

function carregarRascunho() {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

/* ---------------------- Responsável ---------------------- */

function buscarPessoas(texto) {
    const busca = normalizar(texto);
    if (busca.length === 0) return [];
    return pessoas
        .filter(p => normalizar(p.nome).includes(busca))
        .sort((a, b) => normalizar(b.nome).startsWith(busca) - normalizar(a.nome).startsWith(busca))
        .slice(0, 8);
}

function preencherEnderecoResponsavel(item, pessoa) {
    item.querySelector(".resp-nome").value = pessoa.nome;
    item.querySelector(".resp-telefone").value = pessoa.telefone || "";
    item.querySelector(".resp-cep").value = pessoa.endereco?.cep || "";
    item.querySelector(".resp-rua").value = pessoa.endereco?.rua || "";
    item.querySelector(".resp-numero").value = pessoa.endereco?.numero || "";
    item.querySelector(".resp-cidade").value = pessoa.endereco?.cidade || "Goiânia";
    item.dataset.pessoaId = pessoa.id;
}

function criarBlocoResponsavel(dadosSalvos) {
    const tpl = document.querySelector("#tpl-responsavel");
    const clone = tpl.content.cloneNode(true);
    const item = clone.querySelector(".responsavel-item");
    item.dataset.pessoaId = dadosSalvos?.pessoaId || "";

    const campoNome = item.querySelector(".resp-nome");
    const area = item.querySelector(".sugestoes-resp");
    const btnRemover = item.querySelector(".remover-responsavel");

    if (dadosSalvos) {
        campoNome.value = dadosSalvos.nome || "";
        item.querySelector(".resp-telefone").value = dadosSalvos.telefone || "";
        item.querySelector(".resp-cep").value = dadosSalvos.cep || "";
        item.querySelector(".resp-rua").value = dadosSalvos.rua || "";
        item.querySelector(".resp-numero").value = dadosSalvos.numero || "";
        item.querySelector(".resp-cidade").value = dadosSalvos.cidade || "";
    }

    campoNome.addEventListener("input", () => {
        item.dataset.pessoaId = "";
        const resultado = buscarPessoas(campoNome.value);
        area.innerHTML = "";

        if (resultado.length === 0) {
            area.classList.remove("aberto");
            salvarRascunho();
            return;
        }

        resultado.forEach(pessoa => {
            const div = document.createElement("div");
            div.classList.add("sugestao");
            div.innerHTML = `<strong>${pessoa.nome}</strong><br><small>${pessoa.telefone}</small>`;
            div.onclick = () => {
                preencherEnderecoResponsavel(item, pessoa);
                area.classList.remove("aberto");
                document.querySelectorAll(".produto-item").forEach(atualizarVinculoProduto);
                atualizarResumoAtivo();
                salvarRascunho();
            };
            area.appendChild(div);
        });

        area.classList.add("aberto");
        salvarRascunho();
    });

    campoNome.addEventListener("blur", () => {
        setTimeout(() => area.classList.remove("aberto"), 150);
    });

    item.querySelectorAll("input").forEach(inp => inp.addEventListener("input", salvarRascunho));

    btnRemover.onclick = () => {
        item.remove();
        document.querySelectorAll(".produto-item").forEach(atualizarVinculoProduto);
        atualizarResumoAtivo();
        salvarRascunho();
    };

    document.querySelector("#lista-responsaveis").appendChild(clone);
    return item;
}

/* Preenche (ou cria) um bloco de responsável vazio com os dados de uma
   pessoa, sem forçar nada: é chamado apenas quando o usuário clica numa
   sugestão explícita (regra 8 — nunca preenche sozinho, sempre a partir
   de uma ação clara da pessoa que está vendendo). */
function preencherResponsavelSugerido(pessoa) {
    const itens = Array.from(document.querySelectorAll(".responsavel-item"));
    let alvo = itens.find(i => !i.dataset.pessoaId);
    if (!alvo) {
        alvo = criarBlocoResponsavel();
    }
    preencherEnderecoResponsavel(alvo, pessoa);
    document.querySelectorAll(".produto-item").forEach(atualizarVinculoProduto);
    atualizarResumoAtivo();
    salvarRascunho();
}

/* ---------------------- Produtos ---------------------- */

/* Regra 30 (docs/regras-negocio.md): a busca por produto aceita tanto
   descrição digitada livremente quanto código interno/EAN — essencial
   para reconhecer bipagem de leitor óptico, que "digita" o código
   completo seguido de Enter. Match exato por código/EAN tem prioridade
   sobre match textual de descrição. */
function buscarProdutos(texto) {
    const busca = normalizar(texto);
    if (busca.length === 0) return [];
    // TODO (regra 21 de regras-negocio.md): ordenar por frequência real de
    // entrada/saída quando tivermos histórico suficiente de movimentações,
    // não apenas por "começa com"/"contém".
    return produtos
        .filter(p => normalizar(p.descricao).includes(busca)
            || normalizar(p.codigo || "").includes(busca)
            || normalizar(p.bling_extra?.gtin_ean || "").includes(busca))
        .sort((a, b) => normalizar(b.descricao).startsWith(busca) - normalizar(a.descricao).startsWith(busca))
        .slice(0, 8);
}

/* Um código bipado (ou digitado) identifica o produto de forma unívoca —
   diferente de um nome, que pode colidir. Considera match exato de
   código interno ou de EAN. */
function produtoPorCodigoExato(texto) {
    const busca = normalizar(texto);
    if (busca.length < 3) return null;
    return produtos.find(p =>
        normalizar(p.codigo || "") === busca ||
        normalizar(p.bling_extra?.gtin_ean || "") === busca
    ) || null;
}

/* Pets com o mesmo nome digitado. Quando há responsável(is) já
   escolhido(s) na venda, priorizamos pets que já pertencem a eles. */
function buscarPets(texto) {
    const busca = normalizar(texto);
    if (busca.length === 0) return [];

    const respIds = responsaveisAtuaisIds();
    let candidatos = pets.filter(p => normalizar(p.nome).includes(busca));

    candidatos.sort((a, b) => {
        const aExato = normalizar(a.nome) === busca;
        const bExato = normalizar(b.nome) === busca;
        if (aExato !== bExato) return bExato - aExato;

        if (respIds.length) {
            const aTem = a.responsaveis.some(id => respIds.includes(id));
            const bTem = b.responsaveis.some(id => respIds.includes(id));
            if (aTem !== bTem) return bTem - aTem;
        }
        return 0;
    });

    return candidatos.slice(0, 8);
}

function nomesResponsaveis(pet) {
    return pet.responsaveis.map(id => pessoaPorId(id)?.nome || "?").join(" e ");
}

/* Produto que o(s) responsável(is) atual(is) mais compra(m) no histórico,
   para sugerir sem exigir digitação (regra 10 de regras-negocio.md). */
function produtoMaisFrequente(respIds) {
    if (!respIds.length) return null;
    const contagem = {};
    vendas.forEach(v => {
        if (v.responsaveis.some(id => respIds.includes(id))) {
            v.itens.forEach(i => {
                contagem[i.produto_id] = (contagem[i.produto_id] || 0) + 1;
            });
        }
    });
    let melhorId = null, melhorQtd = 0;
    Object.entries(contagem).forEach(([id, qtd]) => {
        if (qtd > melhorQtd) { melhorQtd = qtd; melhorId = Number(id); }
    });
    if (!melhorId || melhorQtd < 2) return null; // só sugere se houver recorrência real
    return produtos.find(p => p.id === melhorId) || null;
}

/* Quantidade sempre representa "quantas unidades/sacos" foram vendidos.
   A label e o step do input são controlados pelo flip-switch Unidade/A granel. */
function ajustarCampoQuantidade(item, produto) {
    const label = item.querySelector(".prod-qtd-label");
    const input = item.querySelector(".prod-qtd");
    const flipSwitch = item.querySelector(".flip-switch");

    const modoUnidade = flipSwitch.dataset.value === "unidade";

    if (modoUnidade) {
        const pesoTxt = produto && produto.peso_kg_por_unidade
            ? ` de ${produto.peso_kg_por_unidade}kg`
            : "";
        label.textContent = `Qtd.${pesoTxt}`;
        input.step = "1";
        if (input.value && !Number.isInteger(parseFloat(input.value))) {
            input.value = Math.round(parseFloat(input.value));
        }
    } else {
        label.textContent = `Qtd. (kg)`;
        input.step = "0.1";
        if (input.value && Number.isInteger(parseFloat(input.value))) {
            input.value = parseFloat(input.value).toFixed(1);
        }
    }
}

function pesoTotalItem(produto, qtd) {
    if (!produto) return null;
    if (produto.vendido_a_granel) return Math.round(qtd * 100) / 100;
    if (produto.peso_kg_por_unidade) return Math.round(qtd * produto.peso_kg_por_unidade * 100) / 100;
    return null;
}

/* Liga o comportamento de qualquer flip-switch (usado tanto para
   Unidade/A granel quanto para Presencial/Online). onChange recebe o
   novo valor (string) já refletido em dataset.value. */
function ligarFlipSwitch(el, onChange) {
    el.addEventListener("click", () => {
        const opcoes = Array.from(el.querySelectorAll(".flip-opt")).map(o => o.dataset.opt);
        const atual = el.dataset.value;
        const idxAtual = opcoes.indexOf(atual);
        const novo = opcoes[(idxAtual + 1) % opcoes.length];
        el.dataset.value = novo;
        el.classList.toggle("flip-alt", novo !== opcoes[0]);
        if (onChange) onChange(novo);
        salvarRascunho();
    });
}

/* ---------------------- Desconto por item (regra 28) ---------------------- */

/* Recalcula e exibe o valor original/desconto/final de um item de produto,
   com base no produto vinculado, na quantidade e no % de desconto
   escolhido. Também recalcula o total geral da venda. */
function atualizarPrecoItem(item) {
    const produto = produtos.find(p => p.id === Number(item.dataset.produtoId));
    const infoEl = item.querySelector(".prod-preco-info");
    if (!produto) {
        infoEl.innerHTML = "";
        atualizarTotalVenda();
        return;
    }

    const qtd = parseFloat(item.querySelector(".prod-qtd").value) || 0;
    const descontoPct = parseFloat(item.querySelector(".prod-desconto").value) || 0;
    const bruto = Math.round(produto.preco * qtd * 100) / 100;
    const final = Math.round(bruto * (1 - descontoPct / 100) * 100) / 100;

    if (descontoPct > 0) {
        infoEl.innerHTML = `<span class="preco-original">R$ ${bruto.toFixed(2)}</span><span class="preco-final">R$ ${final.toFixed(2)}</span> (-${descontoPct}%)`;
    } else {
        infoEl.innerHTML = `<span class="preco-final">R$ ${final.toFixed(2)}</span>`;
    }

    atualizarTotalVenda();
}

function valorFinalItem(item) {
    const produto = produtos.find(p => p.id === Number(item.dataset.produtoId));
    if (!produto) return 0;
    const qtd = parseFloat(item.querySelector(".prod-qtd").value) || 0;
    const descontoPct = parseFloat(item.querySelector(".prod-desconto").value) || 0;
    const bruto = produto.preco * qtd;
    return Math.round(bruto * (1 - descontoPct / 100) * 100) / 100;
}

/* Regra 28: o total precisa refletir todos os descontos aplicados,
   sempre visível antes de confirmar a venda. */
function atualizarTotalVenda() {
    const totalEl = document.querySelector("#venda-total-valor");
    if (!totalEl) return;
    const itens = Array.from(document.querySelectorAll(".produto-item"));
    const total = itens.reduce((soma, item) => soma + valorFinalItem(item), 0);
    totalEl.textContent = `R$ ${total.toFixed(2)}`;
}

/* ---------------------- Bipagem de código de barras/EAN (regra 30) ----------------------
   Um leitor óptico USB simula digitação seguida de Enter. Quando o texto
   digitado bate exatamente com um código/EAN cadastrado, o produto é
   aplicado automaticamente. Se o item atual já estiver ocupado por outro
   produto, um novo item é criado automaticamente para o produto bipado —
   e se o mesmo produto já existir em algum item da venda, a quantidade
   desse item existente é incrementada em vez de duplicar a linha. */
function processarPossivelBipagem(item, campoProduto) {
    const prodMatch = produtoPorCodigoExato(campoProduto.value);
    if (!prodMatch) return false;

    const existente = Array.from(document.querySelectorAll(".produto-item"))
        .find(i => i !== item && Number(i.dataset.produtoId) === prodMatch.id);

    if (existente) {
        const qtdInput = existente.querySelector(".prod-qtd");
        qtdInput.value = (parseFloat(qtdInput.value) || 0) + 1;
        atualizarPrecoItem(existente);

        // O item onde o usuário bipou fica limpo (a quantidade foi para o item já existente).
        campoProduto.value = "";
        item.dataset.produtoId = "";
        item.querySelector(".prod-preco-info").innerHTML = "";
        atualizarTotalVenda();
        salvarRascunho();
        return true;
    }

    if (item.dataset.produtoId && Number(item.dataset.produtoId) !== prodMatch.id) {
        // Item atual já está ocupado por outro produto — cria um novo item
        // automaticamente para o produto recém-bipado, sem exigir clique manual.
        criarBlocoProduto();
        const novoItem = document.querySelector("#lista-produtos .produto-item:last-child");
        aplicarProdutoNoItem(novoItem, prodMatch);
    } else {
        aplicarProdutoNoItem(item, prodMatch);
    }

    salvarRascunho();
    return true;
}

/* Aplica um produto reconhecido a um item de produto qualquer (usado tanto
   pelo autocomplete manual quanto pela bipagem). */
function aplicarProdutoNoItem(item, prod) {
    const campoProduto = item.querySelector(".prod-nome");
    const sugestaoRapida = item.querySelector(".sugestao-rapida");
    campoProduto.value = prod.descricao;
    item.dataset.produtoId = prod.id;
    ajustarCampoQuantidade(item, prod);
    if (sugestaoRapida) sugestaoRapida.style.display = "none";
    atualizarPrecoItem(item);
}

function criarBlocoProduto(dadosSalvos) {
    productIdCounter++;

    const tpl = document.querySelector("#tpl-produto");
    const clone = tpl.content.cloneNode(true);
    const item = clone.querySelector(".produto-item");

    const campoProduto = item.querySelector(".prod-nome");
    const areaSugProduto = item.querySelector(".sugestoes-produto");
    const sugestaoRapida = item.querySelector(".sugestao-rapida");
    const campoPet = item.querySelector(".prod-pet");
    const areaSugPet = item.querySelector(".sugestoes-pet");
    const detalhePet = item.querySelector(".prod-pet-detalhe");
    const avisoVinculo = item.querySelector(".prod-aviso");
    const sugestaoResp = item.querySelector(".sugestao-responsavel");
    const btnRemover = item.querySelector(".remover-produto");
    const flipSwitch = item.querySelector(".flip-switch");
    const campoDesconto = item.querySelector(".prod-desconto");

    item.dataset.petId = dadosSalvos?.petId || "";
    item.dataset.produtoId = dadosSalvos?.produtoId || "";

    if (dadosSalvos) {
        campoProduto.value = dadosSalvos.nomeProduto || "";
        campoPet.value = dadosSalvos.nomePet || "";
        item.querySelector(".prod-qtd").value = dadosSalvos.quantidade || "1";
        if (dadosSalvos.tipoQuantidade === "granel") {
            flipSwitch.dataset.value = "granel";
            flipSwitch.classList.add("flip-alt");
        }
        if (dadosSalvos.desconto) campoDesconto.value = dadosSalvos.desconto;
    }

    ligarFlipSwitch(flipSwitch, () => {
        const prod = produtos.find(p => p.id === Number(item.dataset.produtoId));
        ajustarCampoQuantidade(item, prod);
        atualizarPrecoItem(item);
        atualizarResumoAtivo();
    });

    campoDesconto.addEventListener("change", () => {
        atualizarPrecoItem(item);
        salvarRascunho();
    });

    function aplicarProduto(prod) {
        aplicarProdutoNoItem(item, prod);
        salvarRascunho();
    }

    // Sugestão automática por histórico do(s) responsável(is) já escolhido(s).
    const respIds = responsaveisAtuaisIds();
    const sugerido = produtoMaisFrequente(respIds);
    if (sugerido && !item.dataset.produtoId) {
        sugestaoRapida.style.display = "block";
        sugestaoRapida.textContent = `Sugestão: ${sugerido.descricao} (comprado antes)`;
        sugestaoRapida.onclick = () => aplicarProduto(sugerido);
    }

    // --- autocomplete produto + bipagem ---
    campoProduto.addEventListener("input", () => {
        item.dataset.produtoId = "";
        sugestaoRapida.style.display = "none";
        item.querySelector(".prod-preco-info").innerHTML = "";
        const resultado = buscarProdutos(campoProduto.value);
        areaSugProduto.innerHTML = "";

        if (resultado.length === 0) {
            areaSugProduto.classList.remove("aberto");
            atualizarTotalVenda();
            salvarRascunho();
            return;
        }

        resultado.forEach(prod => {
            const div = document.createElement("div");
            div.classList.add("sugestao");
            const estoqueTxt = prod.vendido_a_granel
                ? `${prod.estoque}kg em estoque`
                : `${prod.estoque} un em estoque`;
            div.innerHTML = `<strong>${prod.descricao}</strong><br><small>R$ ${prod.preco.toFixed(2)} · ${estoqueTxt}</small>`;
            div.onclick = () => {
                aplicarProduto(prod);
                areaSugProduto.classList.remove("aberto");
            };
            areaSugProduto.appendChild(div);
        });

        areaSugProduto.classList.add("aberto");
        atualizarTotalVenda();
        salvarRascunho();
    });

    // Enter no campo de produto: se o texto bater exatamente com um
    // código/EAN, trata como bipagem (regra 30) em vez de busca textual.
    campoProduto.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const tratado = processarPossivelBipagem(item, campoProduto);
        if (tratado) {
            e.preventDefault();
            areaSugProduto.classList.remove("aberto");
        }
    });

    campoProduto.addEventListener("blur", () => {
        setTimeout(() => areaSugProduto.classList.remove("aberto"), 150);
    });

    // --- autocomplete pet ---
    campoPet.addEventListener("input", () => {
        item.dataset.petId = "";
        const resultado = buscarPets(campoPet.value);
        areaSugPet.innerHTML = "";
        detalhePet.style.display = "none";
        avisoVinculo.style.display = "none";
        sugestaoResp.style.display = "none";

        if (resultado.length === 0) {
            areaSugPet.classList.remove("aberto");
            atualizarResumoAtivo();
            salvarRascunho();
            return;
        }

        resultado.forEach(pet => {
            const div = document.createElement("div");
            div.classList.add("sugestao");
            const icone = pet.especie === "Gato" ? "🐱" : "🐶";
            const donos = nomesResponsaveis(pet);
            div.innerHTML = `
                <strong>${icone} ${pet.nome}</strong>
                <br>
                <small>${pet.especie} - ${pet.raca} · dono(s): <span class="match-tag">${donos}</span></small>
            `;
            div.onclick = () => {
                campoPet.value = pet.nome;
                item.dataset.petId = pet.id;
                areaSugPet.classList.remove("aberto");
                mostrarDetalhePet(pet, detalhePet);
                atualizarVinculoProduto(item);
                atualizarResumoAtivo(pet);
                mostrarSugestaoResponsavel(pet, sugestaoResp);
                salvarRascunho();
            };
            areaSugPet.appendChild(div);
        });

        areaSugPet.classList.add("aberto");
        atualizarResumoAtivo();
        salvarRascunho();
    });

    campoPet.addEventListener("blur", () => {
        setTimeout(() => areaSugPet.classList.remove("aberto"), 150);
    });

    item.querySelector(".prod-qtd").addEventListener("input", () => {
        atualizarPrecoItem(item);
        salvarRascunho();
    });

    btnRemover.onclick = () => {
        item.remove();
        atualizarResumoAtivo();
        atualizarTotalVenda();
        salvarRascunho();
    };

    document.querySelector("#lista-produtos").appendChild(clone);

    // Ajusta a label inicial e o preço de acordo com o produto já vinculado (se houver).
    const prodAtual = produtos.find(p => p.id === Number(item.dataset.produtoId));
    ajustarCampoQuantidade(item, prodAtual);
    atualizarPrecoItem(item);
}

function mostrarDetalhePet(pet, detalheEl) {
    if (!pet.observacoes) {
        detalheEl.style.display = "none";
        return;
    }
    detalheEl.style.display = "block";
    detalheEl.innerHTML = `${pet.especie} · ${pet.raca} · ${pet.idade} ano(s)<br>${pet.observacoes}`;
}

/* Sugere o(s) responsável(is) já cadastrado(s) do pet escolhido, como um
   atalho clicável — nunca preenche o campo Responsável sozinho, porque
   pode ser proposital registrar um responsável diferente nessa venda
   (ex: alguém novo levando o pet). Ver regra 8 de regras-negocio.md. */
function mostrarSugestaoResponsavel(pet, sugestaoEl) {
    const jaSelecionados = responsaveisAtuaisIds();
    const candidatos = pet.responsaveis
        .map(pessoaPorId)
        .filter(p => p && !jaSelecionados.includes(p.id));

    if (candidatos.length === 0) {
        sugestaoEl.style.display = "none";
        return;
    }

    sugestaoEl.style.display = "block";
    sugestaoEl.innerHTML = candidatos.map(p =>
        `<span class="chip-sugestao" data-pessoa-id="${p.id}">+ ${p.nome} (${p.telefone})</span>`
    ).join(" ");

    sugestaoEl.querySelectorAll(".chip-sugestao").forEach(chip => {
        chip.onclick = () => {
            const pessoa = pessoaPorId(Number(chip.dataset.pessoaId));
            if (pessoa) preencherResponsavelSugerido(pessoa);
        };
    });
}

/* Se o pet escolhido não pertence a nenhum dos responsáveis atuais da
   venda, avisa e oferece vincular (regra 3 de regras-negocio.md). */
function atualizarVinculoProduto(item) {
    const avisoVinculo = item.querySelector(".prod-aviso");
    const petId = Number(item.dataset.petId);
    const respAtuais = responsaveisAtuais();

    if (!petId || respAtuais.length === 0) {
        avisoVinculo.style.display = "none";
        return;
    }

    const pet = petPorId(petId);
    if (!pet) {
        avisoVinculo.style.display = "none";
        return;
    }

    const naoVinculados = respAtuais.filter(r => !pet.responsaveis.includes(r.id));

    if (naoVinculados.length > 0) {
        const nomes = naoVinculados.map(r => r.nome).join(" e ");
        avisoVinculo.style.display = "block";
        avisoVinculo.innerHTML = `
            ⚠ Este ${pet.nome} (${pet.especie}) está cadastrado apenas com
            <strong>${nomesResponsaveis(pet)}</strong> como responsável.
            Se for o mesmo animal, confirme para vincular também
            <strong>${nomes}</strong>. Se for um pet diferente com o mesmo
            nome, ignore.
            <div class="acoes">
                <button type="button" class="secondary btn-vincular">Vincular ${nomes}</button>
            </div>
        `;
        avisoVinculo.querySelector(".btn-vincular").onclick = () => {
            naoVinculados.forEach(r => pet.responsaveis.push(r.id));
            avisoVinculo.style.display = "none";
        };
    } else {
        avisoVinculo.style.display = "none";
    }
}

/* ---------------------- Resumo dinâmico ---------------------- */

function historicoDoPet(petId) {
    return vendas
        .filter(v => v.pet_id === petId)
        .sort((a, b) => (a.data < b.data ? 1 : -1));
}

function alertasEstoquePet(petId) {
    const compras = historicoDoPet(petId);
    const produtoIds = new Set();
    compras.forEach(v => v.itens.forEach(i => produtoIds.add(i.produto_id)));

    const alertas = [];
    produtoIds.forEach(id => {
        const prod = produtos.find(p => p.id === id);
        if (prod && prod.estoque <= prod.estoque_minimo) {
            alertas.push(`⚠ ${prod.descricao} está com estoque baixo (${prod.estoque}${prod.vendido_a_granel ? "kg" : " un"})`);
        }
    });
    return alertas;
}

function descreverItem(i) {
    const qtdTxt = i.unidade_venda === "kg" ? `${i.quantidade}kg` : `${i.quantidade}un`;
    const pesoTxt = i.peso_total_kg ? ` (${i.peso_total_kg}kg)` : "";
    return `${i.descricao} — ${qtdTxt}${pesoTxt}`;
}

function renderizarResumo(pet) {
    const el = document.querySelector("#resumo-conteudo");

    if (!pet) {
        el.innerHTML = `<p class="resumo-vazio">Digite o nome de um pet em algum produto para ver o histórico.</p>`;
        return;
    }

    const icone = pet.especie === "Gato" ? "🐱" : "🐶";
    const donos = pet.responsaveis.map(id => pessoaPorId(id)?.nome || "?");
    const compras = historicoDoPet(pet.id).slice(0, 5);
    const alertas = alertasEstoquePet(pet.id);

    let comprasHtml = compras.length
        ? compras.map(v => {
            const itens = v.itens.map(descreverItem).join(", ");
            return `<p>${v.data} — ${itens}</p>`;
        }).join("")
        : `<p class="resumo-vazio">Sem compras anteriores registradas.</p>`;

    // Regra 11: silêncio quando não há nada relevante — sem "tudo certo".
    let alertasHtml = alertas.length
        ? `<hr><h3>Alertas</h3>${alertas.map(a => `<p class="tag-alerta">${a}</p>`).join("")}`
        : "";

    el.innerHTML = `
        <h3>Pet</h3>
        <p>${icone} <strong>${pet.nome}</strong> — ${pet.especie}, ${pet.raca}, ${pet.idade} ano(s)</p>

        <h3>Responsável(is)</h3>
        <p>${donos.join(" e ")}</p>

        <hr>

        <h3>Últimas compras</h3>
        ${comprasHtml}

        ${alertasHtml}
    `;
}

function atualizarResumoAtivo(petForcado) {
    if (petForcado) {
        renderizarResumo(petForcado);
        return;
    }

    const itens = Array.from(document.querySelectorAll(".produto-item"));
    for (const item of itens) {
        const petId = Number(item.dataset.petId);
        if (petId) {
            renderizarResumo(petPorId(petId));
            return;
        }
    }

    // Nenhum pet resolvido ainda por clique: tenta pelo texto digitado (match único).
    for (const item of itens) {
        const texto = item.querySelector(".prod-pet").value;
        if (normalizar(texto).length >= 2) {
            const candidatos = buscarPets(texto);
            if (candidatos.length >= 1) {
                renderizarResumo(candidatos[0]);
                return;
            }
        }
    }

    renderizarResumo(null);
}

/* ---------------------- Salvar venda ---------------------- */

/* Regra 31 (docs/regras-negocio.md): quando um item da venda representa
   uma quantidade agregada (ex: 2 unidades do mesmo produto, por bipagem
   repetida ou digitação manual), a baixa real no estoque não decrementa
   um contador genérico — consome lotes específicos por FIFO de validade.
   Isso também é o que permite registrar, por venda, exatamente qual lote
   saiu (útil para rastreabilidade futura). */
function baixarEstoqueDaVenda(itensVenda) {
    itensVenda.forEach(({ produto, qtdBaixa }) => {
        if (!produto || qtdBaixa <= 0) return;
        AgroLotes.consumirFIFO(produto, qtdBaixa);
    });
}

function salvarVenda() {
    // Regra 8: preenchimento incremental — não exigimos nenhum campo
    // obrigatório para permitir salvar uma venda parcialmente preenchida.
    const respItens = Array.from(document.querySelectorAll(".responsavel-item"));
    const nomesResp = respItens.map(i => i.querySelector(".resp-nome").value.trim()).filter(Boolean);
    const respIds = respItens.map(i => Number(i.dataset.pessoaId)).filter(Boolean);

    const itensDom = Array.from(document.querySelectorAll(".produto-item"));
    const atendimentoEl = document.querySelector("#atendimentoSwitch");
    const formaAtendimento = atendimentoEl ? atendimentoEl.dataset.value : "presencial";
    const dataVenda = new Date().toISOString();

    const itensParaBaixa = [];
    const itensVenda = [];
    let totalVenda = 0;
    let petIdPrincipal = null;

    itensDom.forEach(item => {
        const produtoId = Number(item.dataset.produtoId);
        const produto = produtoId ? produtos.find(p => p.id === produtoId) : null;
        const qtd = parseFloat(item.querySelector(".prod-qtd").value) || 0;
        const petId = Number(item.dataset.petId) || null;
        if (!produto || qtd <= 0) return;

        if (!petIdPrincipal && petId) petIdPrincipal = petId;

        const descontoPct = parseFloat(item.querySelector(".prod-desconto").value) || 0;
        const precoFinal = valorFinalItem(item);
        totalVenda += precoFinal;

        itensParaBaixa.push({ produto, qtdBaixa: qtd });
        itensVenda.push({
            produto_id: produto.id,
            descricao: produto.descricao,
            quantidade: qtd,
            unidade_venda: produto.vendido_a_granel ? "kg" : "un",
            preco_unitario: produto.preco,
            desconto_percentual: descontoPct,
            peso_total_kg: pesoTotalItem(produto, qtd),
        });
    });

    // Regra 31: baixa real por lote/validade (FIFO), não por contador agregado.
    baixarEstoqueDaVenda(itensParaBaixa);

    if (itensVenda.length > 0) {
        const novaVenda = {
            id: AgroStore.proximoId(vendas),
            data: dataVenda.slice(0, 10),
            pet_id: petIdPrincipal,
            responsaveis: respIds,
            itens: itensVenda,
            total: Math.round(totalVenda * 100) / 100,
            forma_atendimento: formaAtendimento,
        };
        vendas.push(novaVenda);
    }

    // Persiste as alterações (protótipo com storage local — ver dados-store.js).
    AgroStore.salvar("produtos", produtos);
    AgroStore.salvar("vendas", vendas);

    const quemLabel = nomesResp.length ? nomesResp.join(" e ") : "responsável não informado";
    const msg = document.querySelector("#msg-sucesso");
    msg.style.display = "block";
    msg.textContent = `✔ Venda registrada para ${quemLabel} (${itensDom.length} produto(s)) — atendimento ${formaAtendimento === "online" ? "Online" : "Presencial"} — total R$ ${totalVenda.toFixed(2)}.`;

    limparRascunho();

    // Recarrega a lista de produtos (estoque atualizado) para refletir nas próximas sugestões.
    document.querySelectorAll(".produto-item").forEach(atualizarPrecoItem);
}

/* ---------------------- Boot ---------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    await carregarDados();

    const rascunho = carregarRascunho();

    if (rascunho && (rascunho.responsaveis?.length || rascunho.produtos?.length)) {
        (rascunho.responsaveis.length ? rascunho.responsaveis : [null]).forEach(r => criarBlocoResponsavel(r || undefined));
        (rascunho.produtos.length ? rascunho.produtos : [null]).forEach(p => criarBlocoProduto(p || undefined));

        const atendimentoEl = document.querySelector("#atendimentoSwitch");
        if (atendimentoEl && rascunho.formaAtendimento === "online") {
            atendimentoEl.dataset.value = "online";
            atendimentoEl.classList.add("flip-alt");
        }
    } else {
        criarBlocoResponsavel();
        criarBlocoProduto();
    }

    document.querySelector("#btn-add-responsavel").onclick = () => { criarBlocoResponsavel(); salvarRascunho(); };
    document.querySelector("#btn-add-produto").onclick = () => { criarBlocoProduto(); salvarRascunho(); };
    document.querySelector("#btn-salvar").onclick = salvarVenda;

    const atendimentoEl = document.querySelector("#atendimentoSwitch");
    if (atendimentoEl) {
        ligarFlipSwitch(atendimentoEl);
    }

    atualizarTotalVenda();
});
