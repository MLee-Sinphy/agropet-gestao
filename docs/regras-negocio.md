# Regras de Negócio - AgroPet Gestão

Este documento reúne, em linguagem simples, as ideias e regras que guiam
como o sistema deve se comportar. A ideia é que qualquer pessoa (mesmo sem
saber nada de banco de dados) consiga ler e entender o "porquê" das coisas.
Vamos sempre adicionando novas regras aqui conforme formos pensando juntos.

---

## 1. Tudo nasce da venda

Não existe tela separada para "cadastrar cliente" ou "cadastrar pet".
Isso seria um passo extra e chato. Em vez disso, cadastramos e atualizamos
essas informações automaticamente enquanto registramos uma venda.

Ou seja: pet, responsável e endereço só são criados ou atualizados no
momento em que uma venda está sendo feita. Fora da venda, não alteramos nada.

## 2. Um pet pode ter mais de um responsável

Uma família pode ter várias pessoas cuidando do mesmo animal. Exemplo:
o cachorro Rex mora com Maria e Paulo. Os dois podem levá-lo ao petshop
e comprar produtos para ele. O sistema precisa entender que ambos são
"donos" do mesmo Rex, e não tratar isso como um erro ou um Rex novo.

## 3. Nomes repetidos existem — e isso é normal

Pode existir mais de um pet com o mesmo nome. "Rex" pode ser um cachorro
da Maria e, ao mesmo tempo, um cachorro completamente diferente de outra
família do outro lado da cidade. O sistema não pode simplesmente assumir
que são o mesmo animal só porque o nome bate.

Para saber se estamos falando do "mesmo Rex" ou de "outro Rex", usamos
juntos: nome do pet + nome do responsável (e, quando necessário, o telefone
do responsável, porque nomes de pessoas também se repetem).

Fluxo esperado na tela de venda:
- A pessoa digita o nome do pet (ex: "Rex").
- O sistema procura na base todos os pets com esse nome e mostra, ao lado,
  os responsáveis correspondentes (ex: "Rex - Maria Fernandes", "Rex - outro
  dono").
- Se a pessoa também já sabe o nome do responsável, o sistema cruza as duas
  informações e resolve sozinho para qual pet exato estamos vendendo.
- Se não for possível decidir com clareza, o sistema deve perguntar/mostrar
  as opções em vez de "chutar" e juntar dois animais diferentes.

## 4. Um responsável pode ter vários pets, e vários tipos de pet

A mesma pessoa pode ter um cachorro e um gato, por exemplo. Isso é
tratado de forma natural: o responsável fica ligado a todos os pets que
já apareceram em vendas anteriores.

## 5. Uma venda pode ter vários produtos para vários pets

A pessoa pode ir ao petshop e comprar ração para o cachorro e areia para
o gato, na mesma visita. Por isso a tela de venda é organizada assim:

1. Primeiro escolhe/confirma o responsável (com endereço, se precisar).
2. Depois, para cada produto adicionado à venda, escolhe qual pet aquele
   produto é para. O responsável permanece o mesmo durante toda a venda,
   mas o pet pode mudar produto a produto.

## 6. Endereço com autocomplete pelo CEP

Para facilitar o cadastro (e reduzir digitação), a ideia é que, ao digitar
o CEP, o sistema já preencha rua, bairro e cidade automaticamente. Isso
ainda não está implementado nesta versão de protótipo, mas é uma meta.

## 7. Nem todo produto tem "unidade individual" no estoque

Alguns produtos (como ração ou areia) são vendidos por peso (quilos) e
tirados de um saco maior. Não é possível saber exatamente "qual saco"
foi vendido, apenas quantos quilos saíram daquele tipo de produto.
Outros produtos (como antipulgas, coleiras, brinquedos) são vendidos por
unidade fechada, e cada unidade vendida é uma baixa exata no estoque.

Por isso, cada produto tem um campo "vendido a granel" (sim/não) que
define como o estoque será controlado no futuro.

## 8. Estoque e alertas (visão futura)

Quando o controle de estoque estiver ligado às vendas, o sistema deve:
- Dar baixa automática no estoque ao confirmar uma venda.
- Gerar alertas quando o estoque de um produto estiver ficando baixo
  (ex: "ração Golden 15kg está acabando").
- No resumo de um pet, mostrar sugestões relacionadas ao histórico dele
  (ex: "esse pet costuma comprar ração X a cada 30 dias, já vai fazer 30
  dias da última compra").

## 9. Integração futura com o Bling

O Bling (sistema de gestão usado por muitos pequenos negócios) tem uma
lista grande de campos de produto (código, NCM, origem, GTIN/EAN, peso,
dimensões, fornecedor, estoque mínimo/máximo, categoria, tags, etc.).

A ideia é que, no futuro, o cadastro de produtos aqui consiga se conectar
com o Bling — de forma automática quando possível, ou manual quando não
for possível. Isso significa que, com o tempo, provavelmente vamos
precisar lidar com boa parte (ou todos) desses campos do Bling nas regras
de negócio, mesmo que hoje, nesta versão de protótipo, usemos só os mais
essenciais (código, descrição, unidade, preço, estoque, estoque mínimo,
fornecedor, categoria, marca). Os demais campos ficam reservados para
quando a integração for implementada — não é necessário implementar tudo
agora, só deixar o caminho preparado.

## 10. Simplicidade em primeiro lugar

Toda regra nova que adicionarmos aqui deve, sempre que possível, reduzir
cliques e digitação para quem está usando o sistema no dia a dia do
petshop. Se uma regra tornar o uso mais complicado sem um bom motivo,
ela provavelmente está errada.
