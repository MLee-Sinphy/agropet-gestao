let pets = [];


async function carregarPets(){

    const resposta = await fetch("../assets/data/pets.json");

    pets = await resposta.json();

}


function normalizar(texto){

    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"");

}


function buscarPets(texto){

    const busca = normalizar(texto);


    if(busca.length === 0){

        return [];

    }


    return pets
        .filter(pet => 
            normalizar(pet.nome).includes(busca)
        )
        .sort((a,b)=>{

            const aInicio = normalizar(a.nome).startsWith(busca);
            const bInicio = normalizar(b.nome).startsWith(busca);


            return bInicio - aInicio;

        });

}



function mostrarSugestoes(resultado){

    const area = document.querySelector(".sugestoes");


    area.innerHTML="";


    resultado.forEach(pet=>{


        const div=document.createElement("div");


        div.classList.add("sugestao");


        div.innerHTML=`

            <strong>🐶 ${pet.nome}</strong>

            <br>

            <small>
                ${pet.especie} - ${pet.raca}
            </small>

        `;


        div.onclick=()=>{

            document.querySelector("#pet").value = pet.nome;

            area.innerHTML="";

        };


        area.appendChild(div);


    });

}



document.addEventListener("DOMContentLoaded",()=>{


    carregarPets();


    const campo=document.querySelector("#pet");


    campo.addEventListener("input",()=>{


        const resultado=buscarPets(campo.value);


        mostrarSugestoes(resultado);


    });


});
