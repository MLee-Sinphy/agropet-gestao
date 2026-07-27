/* ==========================================================
   Venda - AgroPet Gestão
   Lógica de autocomplete, resumo dinâmico e desambiguação
   de pets homônimos (regras em docs/regras-negocio.md)
   ========================================================== */

let pessoas = [];
let pets = [];
let produtos = [];
let vendas = [];

let responsavelSelecionado = null; // objeto pessoa quando resolvido

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

/* ---------------------- Responsável ---------------------- */

function buscarPessoas(texto) {
    const busca = normalizar(texto);
    if (busca.length === 0) return [];
    return pessoas
        .filter(p => normalizar(p.nome).includes(busca))
        .sort((a, b) => normalizar(b.nome).startsWith(busca) - normalizar(a.nome).startsWith(busca))
        .slice(0, 8);
}

function preencherEnderecoResponsavel(pessoa) {
    document.querySelector("#resp-telefone").value = pessoa.telefone || "";
    document.querySelector("#resp-cep").value = pessoa.endereco?.cep || "";
    document.querySelector("#resp-rua").value = pessoa.endereco?.rua || "";
    document.querySelector("#resp-numero").value = pessoa.endereco?.numero || "";
    document.querySelector("#resp-cidade").value = pessoa.endereco?.cidade || "Goiânia";
}

function selecionarResponsavel(pessoa) {
    responsavelSelecionado = pessoa;
    document.querySelector("#resp-nome").value = pessoa.nome;
    preencherEnderecoResponsavel(pessoa);
    document.querySelector("#sugestoes-resp").classList.remove("aberto");
    // Reavalia todos os pets já digitados nos produtos, já que o responsável mudou.
    document.querySelectorAll(".produto-item").forEach(atualizarVinculoProduto);
    atualizarResumoAtivo();
}

function iniciarAutocompleteResponsavel() {
    const campo = document.querySelector("#resp-nome");
    const area = document.querySelector("#sugestoes-resp");

    campo.addEventListener("input", () => {
        responsavelSelecionado = null;
        const resultado = buscarPessoas(campo.value);
        area.innerHTML = "";

        if (resultado.length === 0) {
            area.classList.remove("aberto");
            return;
        }

        resultado.forEach(pessoa => {
            const div = document.createElement("div");
            div.classList.add("sugestao");
            div.innerHTML = `<strong>${pessoa.nome}</strong><br><small>${pessoa.telefone}</small>`;
            div.onclick = () => selecionarResponsavel(pessoa);
            area.appendChild(div);
        });

        area.classList.add("aberto");
    });

    campo.addEventListener("blur", () => {
        setTimeout(() => area.classList.remove("aberto"), 150);
    });
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

/* Pets com o mesmo nome digitado. Quando houver mais de um responsável
   já escolhido na venda, priorizamos pets que já pertencem a ele. */
function buscarPets(texto) {
    const busca = normalizar(texto);
    if (busca.length === 0) return [];

    let candidatos = pets.filter(p => normalizar(p.nome).includes(busca));

    candidatos.sort((a, b) => {
        const aExato = normalizar(a.nome) === busca;
        const bExato = normalizar(b.nome) === busca;
        if (aExato !== bExato) return bExato - aExato;

        if (responsavelSelecionado) {
            const aTem = a.responsaveis.includes(responsavelSelecionado.id);
            const bTem = b.responsaveis.includes(responsavelSelecionado.id);
            if (aTem !== bTem) return bTem - aTem;
        }
        return 0;
    });

    return candidatos.slice(0, 8);
}

function nomesResponsaveis(pet) {
    return pet.responsaveis.map(id => pessoaPorId(id)?.nome || "?").join(" e ");
}

function criarBlocoProduto() {
    const tpl = document.querySelector("#tpl-produto");
    const clone = tpl.content.cloneNode(true);
    const item = clone.querySelector(".produto-item");

    const campoProduto = item.querySelector(".prod-nome");
    const areaSugProduto = item.querySelector(".sugestoes-produto");
    const campoPet = item.querySelector(".prod-pet");
    const areaSugPet = item.querySelector(".sugestoes-pet");
    const detalhePet = item.querySelector(".prod-pet-detalhe");
    const avisoVinculo = item.querySelector(".prod-aviso");
    const btnRemover = item.querySelector(".remover-produto");

    item.dataset.petId = "";

    // --- autocomplete produto ---
    campoProduto.addEventListener("input", () => {
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
                campoProduto.value = prod.descricao;
                item.dataset.produtoId = prod.id;
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
    detalheEl.style.display = "block";
    detalheEl.innerHTML = `${pet.especie} · ${pet.raca} · ${pet.idade} ano(s)<br>${pet.observacoes || ""}`;
}

/* Verifica se o responsável atual da venda já é um dos donos do pet
   selecionado nesse produto. Se não for, avisa (sem travar a venda,
   mas deixando claro a regra: nomes repetidos podem ser pets diferentes
   ou o mesmo pet com mais de um dono). */
function atualizarVinculoProduto(item) {
    const avisoVinculo = item.querySelector(".prod-aviso");
    const petId = Number(item.dataset.petId);

    if (!petId || !responsavelSelecionado) {
        avisoVinculo.style.display = "none";
        return;
    }

    const pet = petPorId(petId);
    if (!pet) {
        avisoVinculo.style.display = "none";
        return;
    }

    if (!pet.responsaveis.includes(responsavelSelecionado.id)) {
        avisoVinculo.style.display = "block";
        avisoVinculo.innerHTML = `
            ⚠ Este ${pet.nome} (${pet.especie}) está cadastrado apenas com
            <strong>${nomesResponsaveis(pet)}</strong> como responsável.
            Se for o mesmo animal, confirme para vincular também a
            <strong>${responsavelSelecionado.nome}</strong>. Se for um pet
            diferente com o mesmo nome, ignore.
            <div class="acoes">
                <button type="button" class="secondary btn-vincular">Vincular ${responsavelSelecionado.nome}</button>
            </div>
        `;
        avisoVinculo.querySelector(".btn-vincular").onclick = () => {
            pet.responsaveis.push(responsavelSelecionado.id);
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
        el.innerHTML = `<p class="resumo-vazio">Digite o nome de um pet em algum produto para ver o histórico e alertas.</p>`;
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

    let alertasHtml = alertas.length
        ? alertas.map(a => `<p class="tag-alerta">${a}</p>`).join("")
        : `<p class="tag-ok">✔ Nenhum alerta de estoque para os produtos deste pet.</p>`;

    el.innerHTML = `
        <h3>Pet</h3>
        <p>${icone} <strong>${pet.nome}</strong> — ${pet.especie}, ${pet.raca}, ${pet.idade} ano(s)</p>

        <h3>Responsável(is)</h3>
        <p>${donos.join(" e ")}</p>

        <hr>

        <h3>Últimas compras</h3>
        ${comprasHtml}

        <hr>

        <h3>Alertas</h3>
        ${alertasHtml}
    `;
}

/* Descobre qual pet deve orientar o resumo: usa o pet já resolvido
   (com id) do produto mais recentemente editado; se nenhum tiver id
   ainda, tenta achar por texto digitado no primeiro campo de pet
   não vazio. */
let ultimoPetAtivo = null;

function atualizarResumoAtivo(petForcado) {
    if (petForcado) {
        ultimoPetAtivo = petForcado;
        renderizarResumo(petForcado);
        return;
    }

    const itens = Array.from(document.querySelectorAll(".produto-item"));
    for (const item of itens) {
        const petId = Number(item.dataset.petId);
        if (petId) {
            const pet = petPorId(petId);
            ultimoPetAtivo = pet;
            renderizarResumo(pet);
            return;
        }
    }

    // Nenhum pet resolvido ainda: tenta pelo texto digitado (match único).
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
    const nomeResp = document.querySelector("#resp-nome").value.trim();
    if (!nomeResp) {
        alert("Informe o nome do responsável.");
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
    msg.textContent = `✔ Venda registrada para ${nomeResp} (${itens.length} produto(s)). Protótipo: dados não são persistidos ainda.`;
}

/* ---------------------- Boot ---------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    await carregarDados();

    iniciarAutocompleteResponsavel();
    criarBlocoProduto();

    document.querySelector("#btn-add-produto").onclick = criarBlocoProduto;
    document.querySelector("#btn-salvar").onclick = salvarVenda;
});
