/* ==========================================================
   Gerenciar Cadastros - AgroPets Gestão (regra 34 de regras-negocio.md)
   3 painéis independentes: Clientes, Pets, Produtos. Cada um permite
   buscar, selecionar e editar TODOS os campos, incluindo relações
   (cliente <-> pet) que podem ser adicionadas/removidas livremente.
   ========================================================== */

let pessoas = [];
let pets = [];
let produtos = [];
let vendas = [];

let clienteSelecionadoId = null;
let petSelecionadoId = null;
let produtoSelecionadoId = null;

async function carregarDados() {
    const dados = await AgroStore.carregarTudo("../assets/data/");
    pessoas = dados.pessoas;
    pets = dados.pets;
    produtos = dados.produtos;
    vendas = dados.vendas;
}

function persistir() {
    AgroStore.salvar("pessoas", pessoas);
    AgroStore.salvar("pets", pets);
    AgroStore.salvar("produtos", produtos);
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

function mostrarMsgSalvo(container) {
    let msg = container.querySelector(".msg-salvo-detalhe");
    if (!msg) {
        msg = document.createElement("div");
        msg.className = "msg-salvo-detalhe";
        container.prepend(msg);
    }
    msg.textContent = "✔ Alterações salvas.";
    msg.style.display = "block";
    setTimeout(() => { msg.style.display = "none"; }, 2500);
}

/* =========================================================
   PAINEL 1 - CLIENTES
   ========================================================= */

function renderizarListaClientes(filtro) {
    const el = document.querySelector("#lista-clientes");
    const busca = normalizar(filtro || "");
    const lista = busca
        ? pessoas.filter(p => normalizar(p.nome).includes(busca) || (p.telefone || "").includes(busca))
        : pessoas.slice().sort((a, b) => a.nome.localeCompare(b.nome));

    if (lista.length === 0) {
        el.innerHTML = `<p class="detalhe-vazio">Nenhum cliente encontrado.</p>`;
        return;
    }

    el.innerHTML = lista.slice(0, 60).map(p => `
        <div class="item-lista ${p.id === clienteSelecionadoId ? "selecionado" : ""}" data-id="${p.id}">
            <strong>${p.nome}</strong>
            <small>${p.telefone || ""}</small>
        </div>
    `).join("");

    el.querySelectorAll(".item-lista").forEach(item => {
        item.onclick = () => {
            clienteSelecionadoId = Number(item.dataset.id);
            renderizarListaClientes(document.querySelector("#busca-clientes").value);
            renderizarDetalheCliente();
        };
    });
}

function petsDoResponsavel(pessoaId) {
    return pets.filter(p => p.responsaveis.includes(pessoaId));
}

function renderizarDetalheCliente() {
    const container = document.querySelector("#detalhe-cliente");
    const pessoa = pessoaPorId(clienteSelecionadoId);

    if (!pessoa) {
        container.innerHTML = `<p class="detalhe-vazio">Selecione um cliente na lista para ver e editar os dados completos.</p>`;
        return;
    }

    const petsRelacionados = petsDoResponsavel(pessoa.id);

    container.innerHTML = `
        <div class="msg-salvo-detalhe"></div>
        <div class="detalhe-titulo">${pessoa.nome}</div>

        <div class="campo-detalhe">
            <label>Nome completo</label>
            <input type="text" class="cd-nome" value="${pessoa.nome}">
        </div>
        <div class="campo-detalhe">
            <label>Telefone</label>
            <input type="text" class="cd-telefone" value="${pessoa.telefone || ""}">
        </div>
        <div class="campo-detalhe">
            <label>CEP</label>
            <input type="text" class="cd-cep" value="${pessoa.endereco?.cep || ""}">
        </div>
        <div class="campo-detalhe">
            <label>Rua</label>
            <input type="text" class="cd-rua" value="${pessoa.endereco?.rua || ""}">
        </div>
        <div class="campo-detalhe">
            <label>Número</label>
            <input type="text" class="cd-numero" value="${pessoa.endereco?.numero || ""}">
        </div>
        <div class="campo-detalhe">
            <label>Cidade</label>
            <input type="text" class="cd-cidade" value="${pessoa.endereco?.cidade || ""}">
        </div>

        <label style="font-size:.82rem; font-weight:600; color:#52585a;">Pets relacionados</label>
        <div class="relacao-lista">
            ${petsRelacionados.length
                ? petsRelacionados.map(pet => `
                    <span class="relacao-chip" data-pet-id="${pet.id}">
                        ${pet.especie === "Gato" ? "🐱" : "🐶"} ${pet.nome}
                        <span class="remover-relacao" data-pet-id="${pet.id}">✕</span>
                    </span>
                `).join("")
                : "<span style=\"color:#9aa39d; font-size:.85rem;\">Nenhum pet vinculado.</span>"
            }
        </div>

        <div class="add-relacao">
            <input type="text" class="cd-add-pet" placeholder="Vincular pet existente pelo nome..." autocomplete="off">
            <div class="sugestoes cd-sugestoes-pet"></div>
        </div>

        <button type="button" class="primary btn-salvar-detalhe cd-salvar">Salvar alterações</button>
    `;

    container.querySelectorAll(".remover-relacao").forEach(el => {
        el.onclick = () => {
            const petId = Number(el.dataset.petId);
            const pet = petPorId(petId);
            if (pet) {
                pet.responsaveis = pet.responsaveis.filter(id => id !== pessoa.id);
                persistir();
                renderizarDetalheCliente();
                if (petSelecionadoId === petId) renderizarDetalhePet();
            }
        };
    });

    const campoAddPet = container.querySelector(".cd-add-pet");
    const sugArea = container.querySelector(".cd-sugestoes-pet");
    campoAddPet.addEventListener("input", () => {
        const busca = normalizar(campoAddPet.value);
        sugArea.innerHTML = "";
        if (busca.length === 0) { sugArea.classList.remove("aberto"); return; }

        const candidatos = pets.filter(p => normalizar(p.nome).includes(busca) && !p.responsaveis.includes(pessoa.id)).slice(0, 8);
        candidatos.forEach(pet => {
            const div = document.createElement("div");
            div.className = "sugestao";
            div.innerHTML = `${pet.especie === "Gato" ? "🐱" : "🐶"} <strong>${pet.nome}</strong> — ${pet.raca}`;
            div.onclick = () => {
                pet.responsaveis.push(pessoa.id);
                persistir();
                campoAddPet.value = "";
                sugArea.classList.remove("aberto");
                renderizarDetalheCliente();
                if (petSelecionadoId === pet.id) renderizarDetalhePet();
            };
            sugArea.appendChild(div);
        });
        sugArea.classList.add("aberto");
    });
    campoAddPet.addEventListener("blur", () => setTimeout(() => sugArea.classList.remove("aberto"), 150));

    container.querySelector(".cd-salvar").onclick = () => {
        pessoa.nome = container.querySelector(".cd-nome").value.trim() || pessoa.nome;
        pessoa.telefone = container.querySelector(".cd-telefone").value.trim();
        pessoa.endereco = {
            cep: container.querySelector(".cd-cep").value.trim(),
            rua: container.querySelector(".cd-rua").value.trim(),
            numero: container.querySelector(".cd-numero").value.trim(),
            cidade: container.querySelector(".cd-cidade").value.trim(),
        };
        persistir();
        renderizarListaClientes(document.querySelector("#busca-clientes").value);
        mostrarMsgSalvo(container);
    };
}

/* =========================================================
   PAINEL 2 - PETS
   ========================================================= */

function renderizarListaPets(filtro) {
    const el = document.querySelector("#lista-pets");
    const busca = normalizar(filtro || "");
    const lista = busca
        ? pets.filter(p => normalizar(p.nome).includes(busca))
        : pets.slice().sort((a, b) => a.nome.localeCompare(b.nome));

    if (lista.length === 0) {
        el.innerHTML = `<p class="detalhe-vazio">Nenhum pet encontrado.</p>`;
        return;
    }

    el.innerHTML = lista.slice(0, 60).map(pet => {
        const donos = pet.responsaveis.map(id => pessoaPorId(id)?.nome || "?").join(" e ");
        const icone = pet.especie === "Gato" ? "🐱" : "🐶";
        return `
            <div class="item-lista ${pet.id === petSelecionadoId ? "selecionado" : ""}" data-id="${pet.id}">
                <strong>${icone} ${pet.nome}</strong>
                <small>${pet.raca} · dono(s): ${donos}</small>
            </div>
        `;
    }).join("");

    el.querySelectorAll(".item-lista").forEach(item => {
        item.onclick = () => {
            petSelecionadoId = Number(item.dataset.id);
            renderizarListaPets(document.querySelector("#busca-pets").value);
            renderizarDetalhePet();
        };
    });
}

function renderizarDetalhePet() {
    const container = document.querySelector("#detalhe-pet");
    const pet = petPorId(petSelecionadoId);

    if (!pet) {
        container.innerHTML = `<p class="detalhe-vazio">Selecione um pet na lista para ver e editar os dados completos.</p>`;
        return;
    }

    const donos = pet.responsaveis.map(pessoaPorId).filter(Boolean);

    container.innerHTML = `
        <div class="msg-salvo-detalhe"></div>
        <div class="detalhe-titulo">${pet.especie === "Gato" ? "🐱" : "🐶"} ${pet.nome}</div>

        <div class="campo-detalhe">
            <label>Nome</label>
            <input type="text" class="pd-nome" value="${pet.nome}">
        </div>
        <div class="campo-detalhe">
            <label>Espécie</label>
            <select class="pd-especie">
                <option ${pet.especie === "Cachorro" ? "selected" : ""}>Cachorro</option>
                <option ${pet.especie === "Gato" ? "selected" : ""}>Gato</option>
                <option ${!["Cachorro", "Gato"].includes(pet.especie) ? "selected" : ""} value="${pet.especie}">${pet.especie}</option>
            </select>
        </div>
        <div class="campo-detalhe">
            <label>Raça</label>
            <input type="text" class="pd-raca" value="${pet.raca}">
        </div>
        <div class="campo-detalhe">
            <label>Idade (anos)</label>
            <input type="number" step="0.5" min="0" class="pd-idade" value="${pet.idade}">
        </div>
        <div class="campo-detalhe">
            <label>Observações</label>
            <input type="text" class="pd-observacoes" value="${pet.observacoes || ""}">
        </div>

        <label style="font-size:.82rem; font-weight:600; color:#52585a;">Responsável(is)</label>
        <div class="relacao-lista">
            ${donos.length
                ? donos.map(d => `
                    <span class="relacao-chip" data-pessoa-id="${d.id}">
                        ${d.nome}
                        <span class="remover-relacao" data-pessoa-id="${d.id}">✕</span>
                    </span>
                `).join("")
                : "<span style=\"color:#9aa39d; font-size:.85rem;\">Nenhum responsável vinculado.</span>"
            }
        </div>

        <div class="add-relacao">
            <input type="text" class="pd-add-resp" placeholder="Vincular responsável existente pelo nome..." autocomplete="off">
            <div class="sugestoes pd-sugestoes-resp"></div>
        </div>

        <button type="button" class="primary btn-salvar-detalhe pd-salvar">Salvar alterações</button>
    `;

    container.querySelectorAll(".remover-relacao").forEach(el => {
        el.onclick = () => {
            const pessoaId = Number(el.dataset.pessoaId);
            pet.responsaveis = pet.responsaveis.filter(id => id !== pessoaId);
            persistir();
            renderizarDetalhePet();
            renderizarListaPets(document.querySelector("#busca-pets").value);
            if (clienteSelecionadoId === pessoaId) renderizarDetalheCliente();
        };
    });

    const campoAddResp = container.querySelector(".pd-add-resp");
    const sugArea = container.querySelector(".pd-sugestoes-resp");
    campoAddResp.addEventListener("input", () => {
        const busca = normalizar(campoAddResp.value);
        sugArea.innerHTML = "";
        if (busca.length === 0) { sugArea.classList.remove("aberto"); return; }

        const candidatos = pessoas.filter(p => normalizar(p.nome).includes(busca) && !pet.responsaveis.includes(p.id)).slice(0, 8);
        candidatos.forEach(pessoa => {
            const div = document.createElement("div");
            div.className = "sugestao";
            div.innerHTML = `<strong>${pessoa.nome}</strong> — ${pessoa.telefone}`;
            div.onclick = () => {
                pet.responsaveis.push(pessoa.id);
                persistir();
                campoAddResp.value = "";
                sugArea.classList.remove("aberto");
                renderizarDetalhePet();
                renderizarListaPets(document.querySelector("#busca-pets").value);
                if (clienteSelecionadoId === pessoa.id) renderizarDetalheCliente();
            };
            sugArea.appendChild(div);
        });
        sugArea.classList.add("aberto");
    });
    campoAddResp.addEventListener("blur", () => setTimeout(() => sugArea.classList.remove("aberto"), 150));

    container.querySelector(".pd-salvar").onclick = () => {
        pet.nome = container.querySelector(".pd-nome").value.trim() || pet.nome;
        pet.especie = container.querySelector(".pd-especie").value;
        pet.raca = container.querySelector(".pd-raca").value.trim();
        pet.idade = parseFloat(container.querySelector(".pd-idade").value) || 0;
        pet.observacoes = container.querySelector(".pd-observacoes").value.trim();
        persistir();
        renderizarListaPets(document.querySelector("#busca-pets").value);
        mostrarMsgSalvo(container);
    };
}

/* =========================================================
   PAINEL 3 - PRODUTOS
   ========================================================= */

function renderizarListaProdutos(filtro) {
    const el = document.querySelector("#lista-produtos-cad");
    const busca = normalizar(filtro || "");
    const lista = busca
        ? produtos.filter(p => normalizar(p.descricao).includes(busca) || normalizar(p.codigo || "").includes(busca))
        : produtos.slice().sort((a, b) => a.descricao.localeCompare(b.descricao));

    if (lista.length === 0) {
        el.innerHTML = `<p class="detalhe-vazio">Nenhum produto encontrado.</p>`;
        return;
    }

    el.innerHTML = lista.slice(0, 60).map(p => `
        <div class="item-lista ${p.id === produtoSelecionadoId ? "selecionado" : ""}" data-id="${p.id}">
            <strong>${p.descricao}</strong>
            <small>${p.codigo} · R$ ${p.preco.toFixed(2)}</small>
        </div>
    `).join("");

    el.querySelectorAll(".item-lista").forEach(item => {
        item.onclick = () => {
            produtoSelecionadoId = Number(item.dataset.id);
            renderizarListaProdutos(document.querySelector("#busca-produtos").value);
            renderizarDetalheProduto();
        };
    });
}

function renderizarDetalheProduto() {
    const container = document.querySelector("#detalhe-produto");
    const produto = produtos.find(p => p.id === produtoSelecionadoId);

    if (!produto) {
        container.innerHTML = `<p class="detalhe-vazio">Selecione um produto na lista para ver e editar todos os campos.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="msg-salvo-detalhe"></div>
        <div class="detalhe-titulo">${produto.descricao}</div>
        <div id="pd-form-container"></div>
        <button type="button" class="primary btn-salvar-detalhe pd-prod-salvar">Salvar alterações</button>
    `;

    const formContainer = container.querySelector("#pd-form-container");
    const form = AgroProdutoForm.criar(formContainer, produto, { produtoId: produto.id });

    container.querySelector(".pd-prod-salvar").onclick = () => {
        const { valido, erro, produto: dadosAtualizados } = form.coletar();
        if (!valido) {
            alert(erro);
            return;
        }
        Object.assign(produto, dadosAtualizados, { id: produto.id, lotes: produto.lotes });
        persistir();
        renderizarListaProdutos(document.querySelector("#busca-produtos").value);
        mostrarMsgSalvo(container);
    };
}

/* ---------------------- Boot ---------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    await carregarDados();

    renderizarListaClientes("");
    renderizarListaPets("");
    renderizarListaProdutos("");

    document.querySelector("#busca-clientes").addEventListener("input", e => renderizarListaClientes(e.target.value));
    document.querySelector("#busca-pets").addEventListener("input", e => renderizarListaPets(e.target.value));
    document.querySelector("#busca-produtos").addEventListener("input", e => renderizarListaProdutos(e.target.value));
});
