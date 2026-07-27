/* ==========================================================
   Venda - AgroPet Gestão
   Autocomplete, resumo dinâmico, desambiguação de pets homônimos
   e múltiplos responsáveis por venda.
   Regras completas em docs/regras-negocio.md
   ========================================================== */

let pessoas = [];
let pets = [];
let produtos = [];
let vendas = [];

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
                item.dataset.pessoaId = pessoa.id;
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
        // sempre mantém ao menos um bloco de responsável na tela
        if (document.querySelectorAll(".responsavel-item").length === 0) {
            criarBlocoResponsavel();
        }
    };

    document.querySelector("#lista-responsaveis").appendChild(clone);
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

function ajustarCampoQuantidade(item, produto) {
    const label = item.querySelector(".prod-qtd-label");
    const input = item.querySelector(".prod-qtd");
    if (produto && produto.vendido_a_granel) {
        label.textContent = "Quantidade (kg)";
        input.step = "0.1";
        input.value = input.value === "1" ? "1.0" : input.value;
    } else {
        label.textContent = "Quantidade (un)";
        input.step = "1";
    }
}

function criarBlocoProduto() {
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
    const btnRemover = item.querySelector(".remover-produto");

    item.dataset.petId = "";
    item.dataset.produtoId = "";

    function aplicarProduto(prod) {
        campoProduto.value = prod.descricao;
        item.dataset.produtoId = prod.id;
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
            const itens = v.itens.map(i => `${i.descricao} (${i.quantidade}${i.unidade})`).join(", ");
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

function salvarVenda() {
    const respItens = Array.from(document.querySelectorAll(".responsavel-item"));
    const nomesResp = respItens.map(i => i.querySelector(".resp-nome").value.trim()).filter(Boolean);
    if (nomesResp.length === 0) {
        alert("Informe ao menos um responsável.");
        return;
    }

    const itens = Array.from(document.querySelectorAll(".produto-item"));
    if (itens.length === 0) {
        alert("Adicione ao menos um produto.");
        return;
    }

    for (const item of itens) {
        const nomeProd = item.querySelector(".prod-nome").value.trim();
        const nomePet = item.querySelector(".prod-pet").value.trim();
        if (!nomeProd || !nomePet) {
            alert("Preencha produto e pet em todos os itens adicionados.");
            return;
        }
    }

    const msg = document.querySelector("#msg-sucesso");
    msg.style.display = "block";
    msg.textContent = `✔ Venda registrada para ${nomesResp.join(" e ")} (${itens.length} produto(s)). Protótipo: dados não são persistidos ainda.`;
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
