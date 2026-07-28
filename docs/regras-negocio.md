# Regras de Negócio - AgroPets Gestão

Este documento reúne as regras que guiam o comportamento do sistema.
Cada regra é escrita de forma direta (a norma em si) seguida de um exemplo
prático, para que uma pessoa consiga entender lendo o exemplo, e uma IA
consiga recriar o comportamento lendo a regra.

Objetivo do sistema (contexto para todas as regras abaixo): o fim último
deste software NÃO é controlar estoque nem cadastrar produto — isso é meio,
não fim. O objetivo real é mapear clientes (responsáveis e seus pets) e o
comportamento de compra deles, para gerar insights de negócio para a loja
(frequência de compra, recorrência, o que cada cliente costuma levar, quando
ele provavelmente vai precisar comprar de novo, e sinais de que ele parou de
comprar). Toda regra de modelagem de dados deve favorecer esse objetivo.

---

## 1. Tudo nasce da venda

Regra: não existe tela de cadastro separada para responsável, pet ou
produto. Esses registros são criados ou atualizados automaticamente durante
o fluxo de venda. Fora da venda, nada é alterado.

Exemplo: o vendedor não vai a uma tela "Cadastrar Cliente" antes de vender.
Ele abre a tela de Venda, digita o nome do responsável e do pet, e o
cadastro é criado (ou reconhecido, se já existir) nesse mesmo instante.

---

## 2. Um pet pode ter mais de um responsável

Regra: mais de uma pessoa pode estar legitimamente associada ao mesmo pet.
Isso não é um erro de cadastro, é uma situação normal (ex: casal, família).

Exemplo: o cachorro Rex mora com Maria e Paulo. Os dois podem ir ao
petshop em dias diferentes e comprar produtos para o mesmo Rex. O sistema
reconhece ambos como responsáveis válidos do mesmo pet.

---

## 3. Nomes repetidos são esperados, não são erro

Regra: pode existir mais de um pet com o mesmo nome, sendo animais
completamente diferentes, de famílias diferentes. A identificação
inequívoca de um pet usa a combinação nome do pet + responsável (e,
quando necessário, telefone do responsável — porque nomes de pessoas
também se repetem).

Exemplo: existem dois pets chamados "Rex" na base: um é o cachorro da
Maria e do Paulo; outro é um Labrador que pertence só ao André, sem
relação nenhuma com o primeiro. Ao digitar "Rex" na venda, o sistema lista
os dois e mostra o responsável de cada um para que a pessoa escolha o
certo. Se o responsável da venda já foi selecionado (ex: Maria), o Rex dela
aparece priorizado na lista.

---

## 4. Um responsável pode ter vários pets

Regra: a mesma pessoa pode estar associada a pets de espécies e nomes
diferentes.

Exemplo: Maria tem o cachorro Rex e também um gato chamado Luna. Ambos
aparecem ligados ao cadastro dela.

---

## 5. Uma venda tem responsável(is) e produtos; cada produto tem seu próprio pet

Regra: a venda é organizada em duas camadas. Primeiro, os responsáveis
presentes na compra (pode ser mais de um). Depois, uma lista de produtos,
onde cada produto individualmente aponta para qual pet ele se destina —
porque a mesma visita pode incluir compras para animais diferentes.

Exemplo: Maria e seu marido João vão juntos ao petshop. Na mesma venda,
compram ração para o cachorro Rex e areia higiênica para a gata Luna. É
uma única venda, com dois responsáveis (Maria e João) e dois produtos,
cada um vinculado ao seu pet.

---

## 6. Um único responsável pode comprar vários produtos na mesma venda

Regra: dentro de uma venda, depois de definido(s) o(s) responsável(is),
pode-se adicionar quantos produtos forem necessários, sem repetir a
digitação do responsável a cada produto.

Exemplo: Maria compra ração, petisco e antipulgas para o Rex numa mesma
visita — ela digita o nome dela uma única vez, e adiciona três produtos.

---

## 7. Produto vendido por unidade/saco fechado vs. produto vendido a granel

Regra: todo produto tem um atributo que define como ele é medido. A regra
geral é: "quantidade" na venda representa quantas unidades/sacos foram
vendidos — mesmo produtos como ração, que fisicamente são pesados em
quilos, normalmente são vendidos em sacos fechados (ex: 1 saco de 15kg =
1 unidade vendida). Só quando o produto é realmente "a granel" — vendido
solto, picado de um pacote grande, sem embalagem fechada — é que a
quantidade da venda passa a representar quilos diretamente (podendo ser
fracionário, ex: 2,5kg).

Cada produto guarda também o peso por unidade (quando aplicável), para
que o sistema saiba converter "quantidade vendida" em "peso total
vendido" independentemente de como a venda foi registrada. Isso é
indispensável para o controle de estoque futuro: o sistema vai calcular
quanto ainda resta de um produto subtraindo, do total em estoque, a soma
do peso já vendido.

Exemplo: a loja vende "Ração Golden 15kg" em sacos fechados. Maria compra
2 sacos para o Rex — a venda registra "quantidade: 2 (unidades)", e o
sistema calcula automaticamente que isso equivale a 30kg vendidos (2 x
15kg), porque o produto tem o peso por unidade cadastrado. Já a "Ração
Golden a Granel" é vendida solta, tirada de um saco grande aberto na
loja: se Maria pedir 3,5kg dessa ração, a venda registra diretamente
"quantidade: 3,5 (kg)".

---

## 8. Preenchimento incremental, nunca um interrogatório

Regra: o vendedor no balcão preenche apenas o que sabe naquele momento; os
campos vazios não bloqueiam o salvamento da venda — incluindo o caso
extremo de salvar uma venda sem nenhum responsável informado, se assim
for necessário no momento. Quando o mesmo responsável ou pet aparecer numa
venda futura, e informações novas forem digitadas, o cadastro existente é
atualizado (enriquecido) com essas informações — nunca duplicado.

Exemplo: hoje o vendedor só digita "Maria" e "Rex" e salva a venda sem
telefone nenhum. Duas semanas depois, outro vendedor atende Maria de novo
e ela informa o telefone dela. O sistema reconhece que é a mesma Maria
(pelo cadastro já existente) e apenas completa o campo telefone que estava
vazio — não cria um segundo cadastro de "Maria".

Consequência prática: ao escolher um pet na venda, o sistema mostra os
responsáveis já conhecidos daquele pet como sugestões clicáveis (nome +
telefone), mas nunca preenche o campo Responsável sozinho. Pode ser
proposital estar registrando um responsável diferente do usual naquela
venda (ex: uma pessoa nova levando o pet ao petshop pela primeira vez), e
o sistema não deve presumir isso por conta própria.

---

## 9. Mais de um responsável pode ser adicionado à mesma venda

Regra: a tela de venda permite adicionar mais de um responsável antes de
começar a listar produtos, através de uma ação explícita (ex: botão "+
Adicionar responsável").

Exemplo: um casal chega junto no petshop. O vendedor adiciona Maria como
primeiro responsável e, com um clique em "+", adiciona também o Paulo à
mesma venda, antes de começar a escolher os produtos.

---

## 10. Sugestão de produto por histórico de compra

Regra: ao identificar um responsável (ou pet) com histórico de compras
recorrentes de um mesmo produto, o sistema pode sugerir esse produto
automaticamente ao abrir um novo item de produto na venda, reduzindo
digitação.

Exemplo: João sempre compra "Ração Golden 15kg" quando aparece na loja. Ao
selecionar João como responsável, o próximo campo de produto já vem com
"Ração Golden 15kg" sugerido, antes mesmo dele digitar qualquer letra.

---

## 11. Silêncio é a resposta correta quando não há nada relevante

Regra: nenhuma seção de alerta ou aviso deve exibir uma mensagem "positiva
vazia" (ex: "nenhum alerta") apenas para preencher espaço. Se não há
informação relevante, a seção simplesmente não mostra nada.

Exemplo: se um pet não tem nenhum produto com estoque baixo em seu
histórico, a área de "Alertas" no resumo da venda não exibe absolutamente
nada — não aparece um "✔ tudo certo".

---

## 12. Informação relacional entre pet e responsável não vai em texto livre

Regra: fatos estruturais sobre a relação entre pet e responsável (como
"esse pet tem dois donos" ou "esse pet não é o mesmo que outro pet
homônimo") são representados pela própria lista de responsáveis vinculada
ao pet — nunca escritos como frase dentro do campo de observações do
pet. O campo de observações é reservado a informações físicas/clínicas do
próprio animal (peso, porte, temperamento, alergias, etc.).

Exemplo: em vez de escrever nas observações do Rex "mora com Maria e
Paulo (mesma residência)", o vínculo é representado apenas pela lista de
responsáveis do Rex conter os dois IDs. As observações do Rex ficam
limitadas a algo como "Peso 18kg, porte médio, dócil."

---

## 13. Endereço é parte do responsável, não uma entidade própria

Regra: o endereço nunca é tratado como um cadastro independente — ele é
sempre um detalhe pertencente a um responsável específico. Na interface,
isso deve ser visualmente representado como uma extensão indentada dentro
do bloco do responsável (não como uma seção do mesmo nível hierárquico).

Exemplo: dentro do card do responsável "Maria", o bloco de endereço
aparece recuado à direita, como se fosse um "sub-item" de Maria — e não
uma gaveta separada e paralela a "Responsável".

---

## 14. Confiança incremental dos dados (recomendação para evolução futura)

Regra: como o cadastro é preenchido aos poucos por vendedores diferentes,
idealmente cada informação carrega uma noção implícita de quão confirmada
ela está (ex: informada uma vez vs. confirmada em múltiplas vendas). Isso
evita que um erro de digitação isolado vire "verdade permanente" no
cadastro.

Exemplo: se um vendedor digitar errado o telefone da Maria uma única vez,
e nas duas vendas seguintes o telefone correto for informado, o sistema
deveria conseguir dar mais peso ao valor confirmado repetidamente.

---

## 15. Fusão de cadastros duplicados (recomendação para evolução futura)

Regra: se dois registros de responsável parecem representar a mesma
pessoa (ex: telefone idêntico mas nome digitado de forma diferente), isso
deve ser sinalizado como possível duplicata a mesclar. Sem isso, o
histórico de comportamento do cliente fica fragmentado entre dois
cadastros e os insights de negócio (regra 0 / objetivo do sistema) ficam
prejudicados.

Exemplo: "Maria Fernandes" e "Maria F." com o mesmo telefone provavelmente
são a mesma pessoa; o sistema deveria destacar essa suspeita em vez de
tratá-las como duas clientes diferentes.

---

## 16. Rastro temporal da venda como matéria-prima de insight (recomendação para evolução futura)

Regra: cada venda é um evento de comportamento do cliente. A modelagem
deve preservar o suficiente para calcular, no futuro: data da última
compra por pet/responsável, intervalo médio entre compras, e quais
produtos costumam ser comprados juntos.

Exemplo: se a Maria compra ração para o Rex a cada 30 dias em média, e já
fazem 40 dias desde a última compra, isso deveria virar um sinal
("provavelmente está acabando a ração, considere entrar em contato").

---

## 17. Cliente inativo é sinal de negócio, não só de estoque (recomendação para evolução futura)

Regra: quando um responsável que tinha um padrão de compra recorrente para
de aparecer por um período muito maior que o seu intervalo médio, isso deve
ser tratado como um sinal de possível perda de cliente (churn), separado
dos alertas de estoque.

Exemplo: João comprava ração todo mês há um ano, e já se passaram 60 dias
sem nenhuma compra dele — isso deveria acender um alerta de "cliente
inativo", diferente do alerta de "estoque baixo".

---

## 18. Integração futura com o Bling (estrutura de produto)

Regra: o cadastro de produto hoje usa apenas os campos essenciais (código,
descrição, unidade, preço, estoque, estoque mínimo, fornecedor, categoria,
marca, se é vendido a granel). O Bling possui um conjunto muito mais amplo
de campos (NCM, origem, GTIN/EAN, dimensões, peso bruto/líquido, tags,
tributos, etc.). A expectativa é que, com a integração futura, boa parte
(ou todos) desses campos precisem ser suportados — não é necessário
implementar tudo agora, mas o cadastro de produto deve deixar espaço
reservado para crescer nessa direção sem quebrar o que já existe.

---

## 19. Simplicidade e poucos cliques acima de tudo

Regra: qualquer regra nova adicionada a este documento deve, sempre que
possível, reduzir cliques e digitação do dia a dia. Se uma regra torna o
uso mais complicado sem um ganho claro de insight ou precisão de dado, ela
provavelmente está errada e deve ser reconsiderada.

---

## 20. Forma de atendimento e data da venda são dados de negócio, não só de tela

Regra: toda venda registra também se o atendimento foi Presencial ou
Online, além da data/hora em que foi concluída. Esses dois campos não têm
efeito na lógica de estoque, mas são essenciais para os relatórios de
Inteligência (ex: comparar performance de canal online vs. loja física).
Enquanto não existe banco de dados real, a interface já captura e exibe
esse dado; ele deve ser persistido no banco de dados assim que o sistema
tiver storage real.

Exemplo: Maria compra pelo WhatsApp e recebe em casa — a venda é marcada
como "Online". João entra na loja e compra no balcão — a venda é marcada
como "Presencial". Ambas registram a data da conclusão.

---

## 21. Autocomplete deve aprender com a frequência real de uso (evolução futura)

Regra: o autocomplete de produto (na Venda e no Estoque) hoje ordena
sugestões por "começa com" vs. "contém" o texto digitado. A evolução
planejada é ordenar pela frequência real de entrada/saída de cada produto
— ou seja, ao digitar "ração", os produtos que mais aparecem em vendas e
movimentações de estoque devem subir para o topo da lista de sugestões,
não apenas pela correspondência textual.

Exemplo: se "Ração Golden 15kg" é vendida com muito mais frequência do que
"Ração Golden Filhotes 15kg", ao digitar "raçao gol" a primeira deve
aparecer no topo da lista, mesmo que as duas combinem igualmente com o
texto digitado.

Status: **não implementado ainda** — anotado aqui para não ser perdido.
Quando isso for implementado, a base é o histórico de `vendas.json` (para
produtos vendidos) e o histórico de movimentações de estoque (para
entradas/saídas registradas na tela de Estoque).

---

## 22. Estoque: entradas e saídas em lote, com motivo de remoção inteligente

Regra: a tela de Estoque permite adicionar múltiplos itens de entrada
(mercadoria chegando) e múltiplos itens de saída (item saindo por qualquer
razão) antes de confirmar tudo de uma vez com um único botão "Atualizar
Estoque". Cada item de saída deve, sempre que possível, ter seu motivo
inferido automaticamente:

- Se uma data de validade foi informada e já passou, o motivo é
  automaticamente "venceu" — sem perguntar nada ao usuário.
- Se o motivo não pôde ser inferido e o usuário não selecionou nenhum
  motivo no campo do próprio item, o sistema pergunta o motivo através de
  uma caixa de diálogo específica para aquele item, no momento da
  confirmação. Se dois itens diferentes ficarem sem motivo, a pergunta
  aparece duas vezes (uma por item), nunca agrupada.

Exemplo: o vendedor adiciona 3 itens de saída. O primeiro tem validade
20/01/2026 (já passada) — motivo "venceu" é aplicado automaticamente. O
segundo já tem o motivo "Quebrou" selecionado manualmente no próprio
formulário — nada é perguntado. O terceiro não tem validade nem motivo
selecionado — ao clicar em "Atualizar Estoque", aparece uma caixa
perguntando o motivo específico desse terceiro item.

---

## 23. Mapeamento de campos do Bling para produto e empresa

Regra: para a integração futura com o Bling funcionar sem retrabalho, os
formulários de Produto e de Perfil da Loja devem reservar campos
compatíveis com o que o Bling exige/aceita, mesmo que hoje fiquem vazios
ou escondidos em uma gaveta.

**Empresa (Perfil da Loja) — campos já cobertos na tela `configuracoes.html`:**
Razão social, nome fantasia, CNPJ/CPF, Inscrição Estadual, endereço,
telefone, email, Client ID / API Key, Client Secret (OAuth2 Bling),
usuário Bling, série padrão de NFe.

**Produto — campos essenciais já existentes:** código, descrição,
unidade de venda, preço, estoque, estoque mínimo, fornecedor, categoria,
marca, se é vendido a granel, peso por unidade.

**Produto — campos do Bling ainda não implementados, mas previstos** (ficam
no objeto `bling_extra` de cada produto em `produtos.json`, hoje vazio,
para não quebrar nada ao evoluir o cadastro):
- `ncm` (Nomenclatura Comum do Mercosul, obrigatório para NFe)
- `gtin_ean` (código de barras)
- `origem` (nacional/importado, tabela do Bling)
- `peso_bruto_kg` / `peso_liquido_kg`
- `dimensoes` (altura/largura/profundidade, para frete)
- `unidade_tributavel` e fator de conversão
- `cest` (quando aplicável)
- `tags` / `categoria_bling` (categoria como o Bling reconhece, pode
  diferir da categoria interna usada aqui)
- `preco_custo` (separado do preço de venda, para margem)

Exemplo: hoje "Ração Golden 15kg" tem só os campos internos. Quando a
integração Bling for implementada, o mesmo produto ganha
`bling_extra: { ncm: "2309.90.90", gtin_ean: "7891234567890", origem: "0" }`
sem precisar remodelar o restante do cadastro.

---

## 24. Base inicial de dados para simulação

Regra: o catálogo de produtos (`assets/data/produtos.json`) deve manter
pelo menos ~50 itens típicos de petshop para permitir simulações
realistas de venda e estoque antes de qualquer integração real.

Status: catálogo atual já possui 100 produtos cadastrados — requisito
atendido e superado.

---

## 25. Fluxo de dados planejado até a integração completa com o Bling

Regra (visão de produto, para orientar decisões técnicas futuras): o
sistema deve evoluir na seguinte ordem lógica —

1. Instalar o programa no computador do dono do petshop.
2. Preencher o Perfil da Loja (dados da empresa) uma única vez.
3. Conectar a conta Bling da loja via API (OAuth2).
4. A partir daí, toda entrada de mercadoria (chegada) ou saída (venda,
   vencimento, quebra) é registrada na tela de Estoque com o mínimo de
   campos possível — o autocomplete deve preencher automaticamente todos
   os campos de um produto no momento em que ele for identificado de forma
   inequívoca (ex: só existe uma "Ração Golden 15kg" cadastrada). Quando
   existir mais de um produto compatível com o texto digitado, os campos
   seguintes mostram sugestões restritas às opções ainda possíveis, até
   que a escolha se torne única.
5. Ao concluir uma venda, o estoque é atualizado automaticamente e a nota
   fiscal correspondente é emitida via API do Bling — sem passo manual
   extra do vendedor.

Este documento (regras 20 a 25) absorve e substitui o antigo arquivo
`requisitos_futuros.md`, que tratava dos mesmos temas de forma mais
resumida e sem exemplos.

---

## Nota: melhorias pendentes de UI/dados (não implementadas)

Uma lista detalhada de bugs de interface e do mapeamento completo das 59
colunas do Bling/Excel usado pelo dono do petshop — incluindo a
justificativa para manter a maioria delas invisível por padrão — está em
`docs/melhorias-pendentes.md`. Consultar esse arquivo antes de começar a
próxima rodada de implementação envolvendo Estoque, Perfil da Loja ou
cadastro de Produto.


