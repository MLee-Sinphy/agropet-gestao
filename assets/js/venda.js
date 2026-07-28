let pessoas = [];
let pets = [];
let produtos = [];
let vendas = [];

let productIdCounter = 0; // Counter for unique product IDs

async function carregarDados() {
    const [rPessoas, rPets, rProdutos, rVendas] = await Promise.all([
        fetch("../assets/data/pessoas.json"),
        fetch("../assets/data/pets.json"),
        fetch("../assets/data/produtos.json"),
        fetch("../assets/data/vendas.json"),
    ]);
    pessoas = await rPessoas.json();
    pets = await rPets.json();
    produtos = await rProdutos.json();
    vendas = await rVendas.json();
}

function normalizar(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
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

function criarBlocoResponsavel() {
    const tpl = document.querySelector("#tpl-responsavel");
    const clone = tpl.content.cloneNode(true);
    const item = clone.querySelector(".responsavel-item");
    item.dataset.pessoaId = "";

    const campoNome = item.querySelector(".resp-nome");
    const area = item.querySelector(".sugestoes-resp");
    const btnRemover = item.querySelector(".remover-responsavel");

    campoNome.addEventListener("input", () => {
        item.dataset.pessoaId = "";
        const resultado = buscarPessoas(campoNome.value);
        area.innerHTML = "";

        if (resultado.length === 0) {
            area.classList.remove("aberto");
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
            };
            area.appendChild(div);
        });

        area.classList.add("aberto");
    });

    campoNome.addEventListener("blur", () => {
        setTimeout(() => area.classList.remove("aberto"), 150);
    });

    btnRemover.onclick = () => {
        item.remove();
        document.querySelectorAll(".produto-item").forEach(atualizarVinculoProduto);
        atualizarResumoAtivo();
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
}

/* ---------------------- Produtos ---------------------- */

function buscarProdutos(texto) {
    const busca = normalizar(texto);
    if (busca.length === 0) return [];
    return produtos
        .filter(p => normalizar(p.descricao).includes(busca))
        .sort((a, b) => normalizar(b.descricao).startsWith(busca) - normalizar(a.descricao).startsWith(busca))
        .slice(0, 8);
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

/* Quantidade sempre representa "quantas unidades/sacos" foram vendidos."
   A label e o step do input são controlados pelo switch de Unidade/A granel. */
function ajustarCampoQuantidade(item, produto) {
    const label = item.querySelector(".prod-qtd-label");
    const input = item.querySelector(".prod-qtd");
    const toggleSwitch = item.querySelector(".toggle-switch-checkbox");

    // Se o switch está CHECADO, significa 'Unidade'
    // Se o switch está DESCHECADO (não marcado), significa 'A granel'
    const modoUnidade = toggleSwitch.checked;

    if (modoUnidade) { // Modo "Unidade"
        const pesoTxt = produto && produto.peso_kg_por_unidade
            ? ` de ${produto.peso_kg_por_unidade}kg`
            : "";
        label.textContent = `Quantidade (unidades${pesoTxt})`;
        input.step = "1";
        // Garante que o valor seja inteiro se estiver no modo unidades
        if (input.value && !Number.isInteger(parseFloat(input.value))) {
            input.value = Math.round(parseFloat(input.value));
        }
    } else { // Modo "A granel"
        label.textContent = `Quantidade (kg)`;
        input.step = "0.1";
        // Garante que o valor tenha pelo menos uma casa decimal se estiver no modo a granel
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

function criarBlocoProduto() {
    productIdCounter++; // Incrementa para cada bloco de produto criado
    const currentProductId = productIdCounter; // Pega o ID único para este bloco

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

    const toggleSwitchInput = item.querySelector(".toggle-switch-checkbox");
    const toggleSwitchLabel = item.querySelector(".toggle-switch-label");
    toggleSwitchInput.id = `tipoQuantidadeToggle_${currentProductId}`;
    toggleSwitchLabel.htmlFor = `tipoQuantidadeToggle_${currentProductId}`;

    item.dataset.petId = "";
    item.dataset.produtoId = "";

    // Adiciona event listener ao switch
    toggleSwitchInput.addEventListener("change", () => {
        const prod = produtos.find(p => p.id === Number(item.dataset.produtoId));
        ajustarCampoQuantidade(item, prod);
        atualizarResumoAtivo(); // Atualiza o resumo ao mudar o tipo de quantidade
    });

    function aplicarProduto(prod) {
        campoProduto.value = prod.descricao;
        item.dataset.produtoId = prod.id;
        // Ao aplicar o produto, também ajusta o campo de quantidade com base no switch atual
        ajustarCampoQuantidade(item, prod);
        sugestaoRapida.style.display = "none";
    }

    // Sugestão automática por histórico do(s) responsável(is) já escolhido(s).
    const respIds = responsaveisAtuaisIds();
    const sugerido = produtoMaisFrequente(respIds);
    if (sugerido && !item.dataset.produtoId) {
        sugestaoRapida.style.display = "block";
        sugestaoRapida.textContent = `Sugestão: ${sugerido.descricao} (comprado antes)`;
        sugestaoRapida.onclick = () => aplicarProduto(sugerido);
    }

    // --- autocomplete produto ---
    campoProduto.addEventListener("input", () => {
        item.dataset.produtoId = "";
        sugestaoRapida.style.display = "none";
        const resultado = buscarProdutos(campoProduto.value);
        areaSugProduto.innerHTML = "";

        if (resultado.length === 0) {
            areaSugProduto.classList.remove("aberto");
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
            };
            areaSugPet.appendChild(div);
        });

        areaSugPet.classList.add("aberto");
        atualizarResumoAtivo();
    });

    campoPet.addEventListener("blur", () => {
        setTimeout(() => areaSugPet.classList.remove("aberto"), 150);
    });

    btnRemover.onclick = () => {
        item.remove();
        atualizarResumoAtivo();
    };

    document.querySelector("#lista-produtos").appendChild(clone);
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
    const petIdAtivo = Array.from(document.querySelectorAll(".produto-item"))
        .map(item => Number(item.dataset.petId))
        .filter(id => !!id)[0]; // Pega o primeiro pet preenchido

    renderizarResumo(petPorId(petIdAtivo));
}


/* ---------------------- Inicialização ---------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    await carregarDados();
    document.querySelector("#btn-add-responsavel").onclick = criarBlocoResponsavel;
    document.querySelector("#btn-add-produto").onclick = criarBlocoProduto;
    document.querySelector("#btn-salvar").onclick = () => {
        document.querySelector("#msg-sucesso").style.display = "block";
        setTimeout(() => document.querySelector("#msg-sucesso").style.display = "none", 3000);
        console.log("Venda salva!");
    };

    criarBlocoResponsavel(); // Inicia com um bloco de responsável
    criarBlocoProduto(); // Inicia com um bloco de produto
});



/* ---------------------- Salvar venda ---------------------- */

function salvarVenda() {
    // Regra 8: preenchimento incremental — não exigimos nenhum campo
    // obrigatório para permitir salvar uma venda parcialmente preenchida.
    const respItens = Array.from(document.querySelectorAll(".responsavel-item"));
    const nomesResp = respItens.map(i => i.querySelector(".resp-nome").value.trim()).filter(Boolean);

    const itens = Array.from(document.querySelectorAll(".produto-item"));

    const quemLabel = nomesResp.length ? nomesResp.join(" e ") : "responsável não informado";
    const msg = document.querySelector("#msg-sucesso");
    msg.style.display = "block";
    msg.textContent = `✔ Venda registrada para ${quemLabel} (${itens.length} produto(s)). Protótipo: dados não são persistidos ainda.`;
}

/* ---------------------- Boot ---------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    await carregarDados();

    criarBlocoResponsavel();
    criarBlocoProduto();

    document.querySelector("#btn-add-responsavel").onclick = criarBlocoResponsavel;
    document.querySelector("#btn-add-produto").onclick = criarBlocoProduto;
    document.querySelector("#btn-salvar").onclick = salvarVenda;
});
