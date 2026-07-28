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

## 26. Catálogo externo (Cosmos/Bluesoft): download offline, nunca consulta em tempo real

Regra: o sistema NUNCA deve consumir uma API externa (Cosmos/Bluesoft ou
equivalente) em tempo de execução, a cada produto cadastrado. O fluxo
correto é baixar, fora do programa, uma base de produtos típicos de
petshop indexada por GTIN/EAN, e importar esse resultado como um arquivo
de dados estático dentro do projeto (ex: `assets/data/catalogo_externo.json`).
O casamento com o catálogo da própria loja (`produtos.json`) é feito
sempre por GTIN/EAN como chave — nunca por nome, porque nome não é
padronizado entre fornecedores. Isso elimina custo recorrente de API e
dependência de internet durante o atendimento no balcão.

Exemplo: uma vez por mês (ou quando necessário), faz-se um download/export
manual de uma base de produtos pet por EAN e ela é gravada em
`catalogo_externo.json`. Ao cadastrar "Ração Golden 15kg" com EAN
7891234567890, o sistema busca esse EAN dentro do arquivo local — não faz
nenhuma requisição HTTP para nenhum serviço externo nesse momento.

---

## 27. Preço é obrigatório desde o primeiro cadastro do produto

Regra: todo produto, seja reconhecido automaticamente (por EAN/nome) ou
cadastrado 100% manual, precisa ter preço de venda informado antes de ser
salvo — não é um campo "avançado" nem opcional, é parte do Grupo A
(dados de operação da loja, regra de organização definida junto com os
grupos de campos do cadastro de produto).

Exemplo: o vendedor cadastra uma ração nova que nunca existiu no sistema.
Mesmo que descrição, unidade e categoria venham automaticamente do
catálogo externo (regra 26), o campo de preço de venda fica vazio e
obrigatório — o cadastro não é salvo sem ele.

---

## 28. Desconto percentual por item na venda

Regra: cada item de produto dentro da venda tem seu próprio botão/controle
de desconto, que permite selecionar uma porcentagem de desconto aplicada
apenas àquele item (não à venda como um todo). Antes de confirmar a venda,
a tela precisa mostrar, para cada item com desconto, o valor original, o
percentual aplicado e o valor final — e o total geral da venda precisa
refletir a soma já com os descontos aplicados.

Exemplo: Maria compra dois produtos. No item "Ração Golden 15kg" (R$150),
o vendedor aplica 10% de desconto pelo botão do próprio item — a linha
passa a mostrar R$150 → R$135. O outro item não tem desconto. O total da
venda antes de confirmar mostra R$135 + valor do segundo item, não R$150 +
valor do segundo item.

---

## 29. Código de barras interno para produtos sem EAN de fábrica (ex: a granel)

Regra: produtos que não têm código de barras de fábrica (ex: ração a
granel, produtos fracionados pela própria loja) podem ter um código de
barras interno gerado pelo próprio sistema no momento do cadastro. O
sistema gera a imagem do código (formato compatível com leitor óptico
comum, ex: Code128 ou EAN-13 com prefixo interno da loja), disponibiliza
para download/impressão imediatamente, e a mesma imagem deve poder ser
reimpressa depois a qualquer momento pela tela de gerenciar/editar aquele
produto — sem gerar um código novo, sob risco de duplicar a identidade do
produto (o código gerado uma vez é definitivo para aquele produto).

Exemplo: "Ração Golden a Granel" não tem EAN de fábrica porque é vendida
solta. No cadastro, o dono clica em "Gerar código de barras", baixa a
imagem gerada e cola na embalagem/prateleira. Três meses depois, a
etiqueta descola — ele acessa o mesmo produto em "Gerenciar Produtos" e
clica em "Reimprimir etiqueta", obtendo a mesma imagem/código de antes,
não um código diferente.

---

## 30. Bipagem por leitor de código de barras em Venda e Estoque

Regra: o leiaute atual das telas de Venda e Estoque é mantido como está —
a bipagem é um atalho, não uma tela nova. Um leitor óptico USB funciona
simulando digitação seguida de Enter no campo de produto em foco. Quando
o código bipado corresponde a um produto reconhecido, os campos de
identificação daquele produto (descrição, preço etc.) são preenchidos
automaticamente, sem precisar digitar nome nem escolher em lista de
sugestão. Se o vendedor bipar um segundo produto diferente em seguida, um
novo item de produto é adicionado automaticamente à venda (ou ao lote de
movimentação, no Estoque) já preenchido — sem precisar clicar em
"+ Adicionar produto" manualmente. Os campos de Qtd. e Pet continuam
preenchidos manualmente pelo vendedor, EXCETO quando dois produtos
idênticos são bipados em sequência — nesse caso a quantidade daquele item
é incrementada automaticamente (ver regra 31 sobre o que isso significa
por trás, no controle de estoque).

Exemplo: o vendedor bipa "Ração Golden 15kg" — o item aparece na venda já
com descrição e preço preenchidos, faltando escolher Pet e confirmar
Qtd. Ele bipa em seguida "Areia Higiênica 4kg" — um segundo item é
adicionado automaticamente à mesma venda, já preenchido, sem apagar o
primeiro. Se ele bipar "Ração Golden 15kg" de novo (mesmo produto), o
item já existente na tela passa a mostrar quantidade 2, em vez de criar
um terceiro item duplicado.

---

## 31. A quantidade agregada na tela não corresponde a uma baixa agregada no estoque

Regra: quando a interface mostra um único item com quantidade 2 (por
bipagem repetida do mesmo produto, regra 30), o banco de dados por trás
NÃO simplesmente decrementa "2 unidades" de um contador genérico daquele
produto. A baixa real é feita unidade a unidade, contra lotes/movimentações
de entrada específicos daquele produto (cada um com sua própria validade e
identificação de entrada) — ou seja, o sistema precisa saber exatamente
QUAIS unidades físicas (de qual lote/entrada) foram consumidas, não só
"quantas". A ordem de consumo padrão, na ausência de outra informação, é
FIFO por data de validade (consome primeiro o lote que vence mais cedo).

Exemplo: em tela, o vendedor vê "Ração Golden 15kg — Qtd: 2". Por trás,
existiam em estoque duas entradas distintas do mesmo produto: uma com
validade 10/2026 (lote A) e outra com validade 03/2027 (lote B). A venda
consome 1 unidade do lote A e 1 unidade do lote B (o que vence primeiro
sai primeiro) — o estoque restante desses dois lotes específicos é
reduzido, não um contador único e genérico do produto "Ração Golden
15kg".

---

## 32. Hardware de balcão: leitor de código de barras dedicado e maquininha de cartão (integrações futuras)

Regra: existem dois equipamentos físicos distintos a integrar no futuro,
e não devem ser confundidos entre si:

1. **Leitor de código de barras dedicado** — a loja já possui um
   equipamento próprio (separado do leitor USB genérico assumido na
   regra 30) que hoje é usado de forma manual/isolada, sem comunicação
   com o sistema. A integração futura deve permitir que esse equipamento
   se comunique diretamente com o programa, dispensando até a simulação
   de digitação.
2. **Maquininha de cartão de crédito/débito** — integração para
   confirmar pagamento e valor da venda diretamente com a operadora
   (Stone, Cielo, PagSeguro etc.), sem passo manual de conciliação.

Ambas ficam para o final da implementação, mas precisam estar registradas
desde já para não serem esquecidas e para influenciar decisões de
arquitetura mais cedo (ex: escolher tecnologias que não dificultem essa
integração depois). Antes de implementar, é necessário perguntar ao dono
qual é exatamente o modelo/fabricante de cada equipamento, pois isso
determina qual SDK/API está disponível.

---

## 33. Cadastro de produto totalmente novo (sem match externo): todos os campos disponíveis, organizados em gavetas

Regra: quando um produto não bate com nenhuma base (nem catálogo externo
por EAN, nem base local curada por nome — ver regra 26), o vendedor/dono
precisa conseguir preencher manualmente TODOS os campos relevantes do
produto, inclusive os secundários (fiscais, logística, fornecedor etc. —
ver classificação completa em `docs/melhorias-pendentes.md`, seção 6).
Esses campos secundários continuam organizados em gavetas fechadas por
padrão, para não poluir a tela — mas nenhum deles fica bloqueado ou
oculto de forma que impeça o preenchimento manual completo quando
necessário.

Exemplo: o dono do petshop começa a vender uma ração de uma marca
totalmente nova, ainda não catalogada em nenhuma base. Ele preenche
manualmente descrição, preço, unidade (campos sempre visíveis) e, se
quiser, abre a gaveta "Dados fiscais" para digitar NCM/origem/EAN e a
gaveta "Logística" para peso/dimensões — nada disso é obrigatório para
salvar o cadastro básico, mas está disponível.

---

## 34. Tela de Cadastros/Gerenciar: três painéis verticais — Cliente, Pet, Produto

Regra: a tela de Gerenciar/Cadastros é organizada em três colunas/painéis
lado a lado (dispostos verticalmente cada um, ou seja, cada painel é uma
lista rolável na vertical): Gerenciar Dono/Cliente, Gerenciar Pet,
Gerenciar Produto. Ao selecionar um registro em qualquer um dos três
painéis, TODAS as informações daquele registro aparecem para
visualização e edição — incluindo relações com outras entidades (ex: um
cliente relacionado a outro responsável do mesmo pet, um pet relacionado
ao(s) seu(s) dono(s)) — e essas relações podem ser alteradas diretamente
ali, não só visualizadas.

Exemplo: ao clicar em "Maria" no painel de Clientes, aparecem todos os
dados dela (telefone, endereço) e a lista de pets vinculados, incluindo o
Rex — que por sua vez está também vinculado ao Paulo. É possível, nessa
mesma tela, remover o vínculo do Paulo com o Rex ou adicionar um novo
responsável, sem precisar ir à tela de Venda para isso. O mesmo vale para
o painel de Produto: selecionar "Ração Golden 15kg" mostra todos os
campos do cadastro (inclusive os que hoje ficam em gaveta) para correção
de erros de digitação.

---

## 35. Página de Inteligência: minimalista, objetiva, orientada a correlações que gerem lucro

Regra: a página de Inteligência é o entregável mais importante do sistema
(reforça o objetivo geral do documento, seção introdutória) e por isso
tem liberdade de design maior que as demais telas, mas dentro de
princípios claros: poucas métricas na tela, todas de leitura direta (sem
precisar interpretar/calcular mentalmente), gráficos escolhidos por
eficácia de comunicação (não por variedade visual), e o critério de
inclusão de qualquer gráfico/métrica nessa página é responder à pergunta
"isso ajuda a loja a vender mais ou perder menos clientes?" — métricas
que não respondem a essa pergunta não entram na página, mesmo que sejam
interessantes tecnicamente.

Áreas de correlação esperadas (não exaustivo, evolutivo):
comportamento de compra por responsável/pet (frequência, recência,
ticket médio, sinal de possível churn — já coberto pelas regras 16 e 17),
padrão de produtos comprados juntos, sazonalidade de categorias, giro de
estoque por produto/categoria (o que vende rápido vs. o que fica parado
consumindo capital), e margem por produto/categoria (depende do campo de
preço de custo, regra 23/Grupo do documento de melhorias pendentes).

Exemplo: em vez de um dashboard genérico com 15 gráficos de todo tipo de
contagem possível, a página de Inteligência mostra, por exemplo, um
número direto ("12 clientes com padrão de compra quebrado este mês —
provável risco de perda") ao lado de um gráfico simples mostrando quais
produtos mais aparecem juntos na mesma venda (para orientar promoções
combinadas) — cada elemento da tela responde a uma decisão prática que o
dono do petshop pode tomar, não é uma vitrine de dados por si só.

---

## Nota: melhorias pendentes de UI/dados (não implementadas)

Uma lista detalhada de bugs de interface e do mapeamento completo das 59
colunas do Bling/Excel usado pelo dono do petshop — incluindo a
justificativa para manter a maioria delas invisível por padrão — está em
`docs/melhorias-pendentes.md`. Consultar esse arquivo antes de começar a
próxima rodada de implementação envolvendo Estoque, Perfil da Loja ou
cadastro de Produto.


