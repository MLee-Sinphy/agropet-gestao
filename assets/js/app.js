document.addEventListener("DOMContentLoaded", () => {

    const venda = document.querySelector(".card-venda");
    const estoque = document.querySelector(".card-estoque");
    const inteligencia = document.querySelector(".card-inteligencia");


    venda.addEventListener("click", () => {
        window.location.href = "pages/clientes.html";
    });


    estoque.addEventListener("click", () => {
        window.location.href = "pages/produtos.html";
    });


    inteligencia.addEventListener("click", () => {
        window.location.href = "pages/dashboard.html";
    });

});
