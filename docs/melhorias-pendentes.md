# Melhorias Pendentes para a Próxima Atualização - AgroPets Gestão

Este documento reúne pontos levantados pelo usuário em 28/07/2026, após a
última rodada de implementação (commit 7d4df68), para serem tratados na
PRÓXIMA atualização. Nada aqui foi implementado ainda — é só registro para
não perder o que foi pedido.

---

## 1. "Perfil da Loja" ausente ou inconsistente em algumas páginas

- Na Home (`index.html`) o link "Perfil da Loja" não aparece em lugar
  nenhum do header.
- Em Estoque (`pages/produtos.html`) o link aparece, mas com formatação
  diferente da usada em Venda/Cadastros/Inteligência (ver classe
  `.company-data-text` em `style.css` vs. o que está realmente sendo
  aplicado em produtos.html — provavelmente falta ajuste fino de CSS ou
  falta importar `style.css` corretamente/checar herança de classes).
- Ação futura: padronizar o header (`<header class="header">` +
  `<nav class="header-nav">` com o link "Perfil da Loja") em TODAS as
  páginas, incluindo a Home, com o mesmo componente/estilo, para não
  precisar repetir/ajustar manualmente em cada página nova.

---

## 2. Estoque: não abrir nenhum bloco por padrão

- Hoje `estoque.js` chama `criarBlocoEntrada()` automaticamente no boot,
  deixando um bloco de "Entrada" já aberto quando a página carrega.
- Pedido: a página deve abrir **vazia**, sem nenhum bloco de movimento. O
  usuário decide explicitamente se quer "Adicionar item" (entrada) ou
  "Remover item" (saída) antes de qualquer bloco aparecer.
- Também remover os parênteses dos botões: hoje é "+ Adicionar item
  (entrada)" e "− Remover item (saída)" — trocar para algo mais limpo, ex.
  "+ Adicionar item" / "− Remover item", já que a tag/cor do próprio bloco
  (ver item 4 abaixo) já deixa claro se é entrada ou saída.

---

## 3. Bug visual: switch de "Forma de Atendimento" mal alinhado verticalmente

- Na página de Venda (https://mlee-sinphy.github.io/agropets-gestao/pages/venda.html),
  o switch de Presencial/Online (acima do título "AgroPet", no bloco
  "Forma de Atendimento") está com alinhamento vertical ruim — parece
  "baixo" comparado ao alinhamento do switch Unidade/Qtd. dentro do bloco
  de Produto.
- Ação futura: revisar `.bloco-atendimento` e `.flip-switch` em
  `venda.css` — provavelmente um ajuste de `align-items`/`line-height` no
  container do switch de atendimento específico, para alinhar
  verticalmente com o título "Forma de Atendimento" do mesmo jeito que o
  switch de Unidade/Granel alinha com o campo "Qtd." ao lado.

---

## 4. Estoque: botão único Entrada/Saída (toggle) em vez de dois botões separados

- Hoje existem dois botões separados: "+ Adicionar item" (verde, cria
  bloco de entrada) e "− Remover item" (vermelho, cria bloco de saída).
- Pedido: um único bloco por item, com um botão/tag "Entrada" (verde) que,
  ao ser clicado, se transforma em "Saída" (vermelho) — com uma animação
  de transição de cor (verde → vermelho e vice-versa). Isso evita ter que
  redigitar todo o formulário do item (produto, quantidade etc.) só porque
  a pessoa errou o tipo de movimento e precisa corrigir.
- Ação futura: unificar os templates de entrada/saída em um único bloco de
  "movimento" com um campo de tipo alternável (parecido com o flip-switch
  já usado em Unidade/Granel e Presencial/Online, mas estilizado como
  botão/tag em vez de interruptor pequeno). Ao trocar o tipo, os campos
  específicos de cada modo (Validade para entrada, Motivo para saída)
  devem aparecer/desaparecer dinamicamente no mesmo bloco.

---

## 5. Campo de Data: o `<input type="date">` nativo é ruim para digitação rápida

- O seletor de data padrão do navegador (que no Mac/Safari usa o "rolinho"
  da Apple) é lento para digitação rápida no balcão do petshop.
- Pedido: substituir por um campo de texto com máscara/validação própria,
  digitando dia, mês e ano diretamente (ex: `DD/MM/AAAA`), sempre validando:
  - Formato correto (dia entre 1-31, mês entre 1-12, ano plausível).
  - Nenhum erro bobo de digitação (ex: 31/02, 32/01).
  - Para o campo de Validade (Estoque): idealmente também alertar/confirmar
    quando a data digitada já está no passado, já que isso *é* esperado
    para o fluxo de saída por vencimento (não deve ser tratado como erro
    de digitação nesse caso específico — só validar formato).
- Ação futura: criar um componente de input de data reutilizável (3 campos
  separados dia/mês/ano OU um único campo com máscara e parsing), com
  função de validação centralizada, reaproveitável em qualquer lugar do
  sistema que precise de data (Validade no Estoque, e futuramente
  Nascimento do pet, Data da venda, etc.).

---

## 6. Cadastro de Produto: mapeamento completo das colunas do Bling/Excel do dono

O usuário forneceu a lista completa de colunas que aparecem hoje na
planilha Excel usada pelo dono do petshop (compatível com a estrutura de
importação/exportação de produtos do Bling). Isso complementa e substitui
parcialmente a regra 23 (mapeamento genérico) já registrada em
`docs/regras-negocio.md` — aqui está o detalhamento coluna a coluna, com
a decisão de exposição na interface e a justificativa.

### 6.1 Lista completa das colunas (conforme enviado pelo usuário)

| Col | Campo | Col | Campo | Col | Campo | Col | Campo | Col | Campo |
|---|---|---|---|---|---|---|---|---|---|
| A | ID | J | Situação | S | Peso bruto (Kg) | AC | Produto Variação | AN | CEST |
| B | Código | K | Estoque | T | GTIN/EAN | AD | Tipo Produção | AO | Volumes |
| C | Descrição | L | Preço de custo | U | GTIN/EAN da Embalagem | AE | Classe enquadramento IPI | AP | Descrição Curta |
| D | Unidade | M | Cód. no fornecedor | V | Largura do produto | AF | Código na Lista de Serviços | AQ | Cross-Docking |
| E | NCM | N | Fornecedor | W | Altura do produto | AG | Tipo do item | AR | URL Imagens Externas |
| F | Origem | O | Localização | X | Profundidade do produto | AH | Grupo de Tags/Tags | AS | Link Externo |
| G | Preço | P | Estoque máximo | Y | Data Validade | AI | Tributos | AT | Meses Garantia Fornecedor |
| H | Valor IPI fixo | Q | Estoque mínimo | Z | Descrição do Produto no Fornecedor | AJ | Código Pai | AU | Clonar dados do pai |
| I | Observações | R | Peso líquido | AA | Descrição Complementar | AK | Código Integração | AV | Condição do Produto |
| | | | | AB | Itens p/ caixa | AL | Grupo de produtos | AW | Frete Grátis |
| | | | | | | AM | Marca | AX | Número FCI |
| | | | | | | | | AY | Vídeo |
| | | | | | | | | AZ | Departamento |
| | | | | | | | | BA | Unidade de Medida |
| | | | | | | | | BB | Preço de Compra |
| | | | | | | | | BC | Valor base ICMS ST retenção |
| | | | | | | | | BD | Valor ICMS ST retenção |
| | | | | | | | | BE | Valor ICMS próprio substituto |
| | | | | | | | | BF | Categoria do produto |
| | | | | | | | | BG | Informações Adicionais |

Total: 59 colunas.

### 6.2 Critério de decisão (como decidir o que aparece na tela vs. o que fica invisível)

Três perguntas, nessa ordem de prioridade, para cada coluna:

1. **É necessária para identificar o produto de forma única durante uma
   venda/movimentação de estoque no balcão?** Se sim → aparece SEMPRE
   visível no formulário principal (não em gaveta).
2. **É legalmente obrigatória para emissão de NFe (mesmo que preenchida
   uma única vez, no cadastro do produto, e nunca mais tocada depois)?**
   Se sim → fica no cadastro de produto (não na venda), mas em campo
   visível — porque um erro aqui trava a emissão da nota, não é opcional.
3. **É usada apenas por integração/log/rastreabilidade, sem impacto direto
   no dia a dia de quem vende no balcão?** Se sim → vai para dentro de
   `bling_extra` (campo invisível/gaveta), preenchido pela importação do
   banco de dados do Bling ou por quem cadastra o produto pela primeira
   vez com calma, não pelo vendedor correndo no balcão.

### 6.3 Classificação coluna a coluna

**Grupo 1 — Essenciais, sempre visíveis no formulário de produto e/ou
autocomplete (resolvem a pergunta 1: identificação inequívoca no balcão)**

- `B Código` — **crítico**. Ver seção 6.4 abaixo: é a resposta direta para
  o problema de "dois produtos com o mesmo nome" que o usuário apontou.
- `C Descrição` — já implementado (`descricao`).
- `AP Descrição Curta` — já cobre parcialmente por `descricao`; sugerido
  como um segundo campo opcional em gaveta, útil quando a descrição
  completa é longa/técnica e o vendedor quer digitar algo mais coloquial
  no autocomplete (ex: descrição = "Ração Golden Special Adultos Raças
  Médias e Grandes 15kg", descrição curta = "Ração Golden 15kg Adulto
  Grande"). Já existe espaço conceitual pois `descricao` e
  `Z/AA/AP` do Bling têm papéis distintos.
- `D Unidade` — já implementado (`unidade_venda`, com a lógica de
  granel/peso — regra 7 de regras-negocio.md).
- `G Preço` — já implementado (`preco`).
- `K Estoque` / `P Estoque máximo` / `Q Estoque mínimo` — `estoque` e
  `estoque_minimo` já implementados; `estoque máximo` ainda não existe e é
  útil para alertar excesso de compra/capital parado — sugerido adicionar
  como campo simples visível no cadastro (não é avançado, é operacional).
- `N Fornecedor` — já implementado (`fornecedor`).
- `AM Marca` — já implementado (`marca`).
- `BF Categoria do produto` — já implementado como `categoria` (mapear
  1:1 ao nome exato do Bling ao integrar, sem duplicar conceito).
- `I Observações` — já implementado (`observacoes`).

**Grupo 2 — Obrigatórias para NFe, visíveis no cadastro de produto, mas
fora do fluxo de venda no balcão (resolvem a pergunta 2)**

- `E NCM` — obrigatório para NFe. Sem isso a nota não sai. Fica em campo
  visível no cadastro de produto (gaveta "Dados fiscais"), preenchido uma
  vez.
- `F Origem` — idem, obrigatório para NFe (nacional/importado/etc.),
  mesma gaveta "Dados fiscais".
- `T GTIN/EAN` — código de barras. Não é obrigatório para toda NFe, mas é
  praticamente universal em petshop (produtos vêm com código de barras de
  fábrica) e tem um bônus enorme de usabilidade: com leitor de código de
  barras (USB, baratinho), o vendedor bipa o produto e o sistema já
  identifica univocamente, sem precisar digitar nome nem código interno.
  Fica em campo visível na gaveta "Dados fiscais/logística".
- `L Preço de custo` / `BB Preço de Compra` — importante para a
  Inteligência (margem de lucro por produto/categoria), mas não deve
  aparecer no fluxo de venda (não é da conta do balcão). Fica no cadastro
  de produto, campo visível mas em seção separada ("Custos", não
  "Fiscal"), já que impacta relatório e não a nota fiscal.

**Grupo 3 — Relevantes, mas de baixa frequência de uso: ficam em gaveta
("campos avançados") dentro do cadastro de produto, editáveis quando
necessário, mas ocultos por padrão**

- `H Valor IPI fixo` — a maioria dos itens de petshop não tem IPI
  relevante; quando existe, é exceção. Gaveta fiscal.
- `M Cód. no fornecedor` — útil para reposição de compra junto ao
  fornecedor, mas não para vender no balcão. Gaveta "Fornecedor/compra".
- `O Localização` — útil para picking físico dentro da loja (ex:
  "Corredor 3, Prateleira B"), relevante para quem repõe estoque, não para
  quem vende. Gaveta "Logística interna".
- `R Peso líquido` / `S Peso bruto (Kg)` — usados apenas quando a loja
  vende pelo peso do próprio produto (ex: ração a granel já cobre isso via
  `peso_kg_por_unidade`/`vendido_a_granel`); peso bruto/líquido do Bling é
  majoritariamente para cálculo de frete em e-commerce. Gaveta
  "Logística/frete", relevante só se/quando existir venda online com
  entrega.
- `U GTIN/EAN da Embalagem` — GTIN do "caixa fechada" (múltiplas
  unidades), útil só para compra em grande volume/fornecedor. Gaveta
  "Fornecedor/compra".
- `V/W/X Largura/Altura/Profundidade` — dimensões, relevantes apenas para
  cálculo de frete de entrega/e-commerce. Gaveta "Logística/frete".
- `Y Data Validade` — **atenção**: isso é a validade padrão do LOTE do
  produto no cadastro geral do Bling, diferente da validade que já
  implementamos por movimentação de entrada no Estoque (cada entrada pode
  ter uma validade própria, porque lotes diferentes vencem em datas
  diferentes). Mantemos a validade por movimentação (já implementado) e
  deixamos esse campo do cadastro geral como "validade padrão sugerida"
  em gaveta, preenchida automaticamente no formulário de entrada quando o
  produto tiver esse dado, mas sempre editável por lote.
- `Z Descrição do Produto no Fornecedor` — texto que o fornecedor usa no
  catálogo dele, útil só para conferência de pedido de compra. Gaveta
  "Fornecedor/compra".
- `AA Descrição Complementar` — texto técnico adicional, baixo uso no dia
  a dia. Gaveta "Detalhes".
- `AB Itens p/ caixa` — quantas unidades vêm por caixa do fornecedor,
  relevante só na hora de decidir quanto comprar. Gaveta
  "Fornecedor/compra".
- `AC Produto Variação` / `AJ Código Pai` / `AU Clonar dados do pai` —
  suporte a produto com variações (ex: mesma ração em tamanhos
  diferentes) tratado como "produto pai + variações filhas" no Bling.
  Relevante conceitualmente, mas tratamos como melhoria de modelagem
  futura, não campo isolado — precisa de decisão de arquitetura própria
  (não é só "adicionar campo", é decidir se o catálogo interno vai
  suportar hierarquia pai/filho). Fica anotado como item de arquitetura
  futura, não como campo simples de gaveta.
- `AD Tipo Produção` / `AE Classe de enquadramento do IPI` / `AF Código na
  Lista de Serviços` / `AG Tipo do item` / `AI Tributos` — campos
  tributários/fiscais de baixíssima frequência de edição manual
  (normalmente vêm prontos do cadastro fiscal padrão do Bling ou de
  regras tributárias gerais da loja, não mudam produto a produto na
  prática do petshop). Gaveta fiscal avançada, praticamente "preencha uma
  vez e esqueça".
- `AH Grupo de Tags/Tags` — útil para filtros internos/relatórios de
  Inteligência futuros (ex: "promoção", "linha premium"). Gaveta
  "Detalhes", opcional.
- `AK Código Integração` — identificador técnico para sincronizar com
  outros sistemas de e-commerce/marketplace via Bling. Só relevante se/
  quando a loja vender em outros canais integrados. Gaveta avançada.
- `AL Grupo de produtos` — similar a categoria, mas é uma sub-classificação
  do Bling; mapear como sinônimo/subcampo de `categoria` quando a
  integração acontecer, sem exigir preenchimento manual duplicado.
- `AN CEST` — só relevante para produtos sujeitos a Substituição
  Tributária (ICMS-ST) em alguns estados; nem todo petshop precisa. Gaveta
  fiscal avançada, aparece apenas se a loja operar com produtos sujeitos a
  isso.
- `AO Volumes` — quantidade de volumes de despacho para transporte/frete
  de e-commerce. Gaveta "Logística/frete".
- `AQ Cross-Docking` — prazo de despacho em operação de cross-docking
  (fornecedor entrega direto ao cliente final); só relevante em operações
  de e-commerce mais sofisticadas, não no petshop físico típico. Gaveta
  avançada, baixíssima prioridade.
- `AR URL Imagens Externas` / `AS Link Externo` / `AY Vídeo` — mídia para
  loja virtual/marketplace. Só relevante se a loja vender online com
  catálogo visual próprio. Gaveta "Mídia/E-commerce", opcional.
- `AT Meses Garantia no Fornecedor` — praticamente nunca aplicável a
  ração/produtos de consumo de petshop (mais comum em eletrônicos);
  mantido só porque pode existir em produtos como bebedouros elétricos,
  tosadeiras etc. Gaveta "Fornecedor/compra".
- `AV Condição do Produto` (novo/usado) — petshop normalmente só vende
  produto novo; campo de baixíssimo uso, mas mantido em gaveta para não
  quebrar compatibilidade se a loja um dia vender produto usado/demonstração.
- `AW Frete Grátis` — flag de e-commerce/marketplace, sem uso na venda
  presencial. Gaveta "Mídia/E-commerce".
- `AX Número FCI` — Ficha de Conteúdo de Importação, só aplicável a
  produto importado sujeito a essa declaração específica; raríssimo em
  petshop. Gaveta fiscal avançada.
- `AZ Departamento` — subdivisão administrativa interna do Bling, útil
  apenas se a loja tiver departamentos formais de gestão; petshop pequeno/
  médio normalmente não usa. Gaveta avançada.
- `BA Unidade de Medida` — o Bling tem esse campo separado de `D Unidade`
  em alguns contextos (unidade tributável vs. unidade de venda). Mapear
  como o mesmo conceito de "unidade" quando possível; se a integração
  revelar que são de fato distintos, tratar como campo técnico de
  conversão em gaveta fiscal.
- `BC/BD/BE Valores de ICMS-ST` — cálculos tributários derivados,
  praticamente nunca digitados manualmente (calculados pelo próprio
  sistema fiscal/Bling a partir de outras informações). Gaveta fiscal
  avançada, tratados como "somente leitura" quando a integração acontecer,
  não como campo de digitação manual.
- `BG Informações Adicionais` — campo de texto livre genérico do Bling,
  equivalente conceitualmente a `observacoes`; ao integrar, decidir se
  mapeia para o mesmo campo ou fica como campo extra de rodapé de nota
  fiscal. Gaveta "Detalhes".

**Grupo 4 — Não é campo de produto, é status/controle: tratar separado**

- `A ID` — identificador interno do Bling; não é um campo para o usuário
  ver/editar, é só a chave técnica de sincronização. Fica em
  `bling_extra.bling_id`, nunca exposto na interface.
- `J Situação` — ativo/inativo no catálogo do Bling. Equivalente a um
  campo de controle (soft delete/arquivamento), não um dado de produto.
  Quando a integração existir, devemos espelhar isso como
  "produto ativo/inativo" no nosso cadastro (afeta se ele aparece no
  autocomplete de venda), mas não é uma "informação" que o vendedor
  preenche — é um estado do sistema.

### 6.4 Sobre o problema levantado: "e se tiver dois produtos com o mesmo nome?"

O usuário tem razão em apontar essa lacuna — hoje o autocomplete de
produto busca só por `descricao`, e a regra de "nomes repetidos são
esperados, não são erro" (regra 3 de regras-negocio.md) já existe para
Pet, mas não foi estendida para Produto. Fica registrada aqui a decisão
recomendada para a próxima atualização:

**Argumento a favor de reforçar Código como campo de busca alternativo:**

1. Nome de produto SEMPRE pode colidir. Ex: duas marcas diferentes podem
   ter uma ração chamada só "Premium" na etiqueta, ou o mesmo fornecedor
   vender "Ração Golden 15kg" em duas formulações (adulto/filhote) que o
   vendedor às vezes digita de forma abreviada e idêntica. O nome por si
   só nunca é uma chave confiável de identificação unívoca — só a
   descrição completa + código evitam ambiguidade real.
2. O `codigo` (coluna B do Bling) já existe no nosso `produtos.json`
   (campo `codigo`, ex: "PET1001") mas HOJE não é usado em lugar nenhum da
   busca/autocomplete — só é exibido como texto informativo. Isso é uma
   lacuna real: se dois produtos tiverem descrições parecidas, o
   vendedor não tem hoje um jeito rápido de diferenciá-los digitando o
   código, que é justamente pensado para ser único e mais curto de
   digitar/bipar.
3. Recomendação para a próxima atualização: o autocomplete de produto
   (tanto em Venda quanto em Estoque) deve buscar por `descricao` OU
   `codigo` OU `gtin_ean` simultaneamente (assim que o campo `gtin_ean`
   existir), com prioridade de match exato de código/EAN sobre match
   textual de descrição — porque código/EAN são, por definição, únicos,
   enquanto descrição é só um texto de conveniência.
4. Isso também abre o caminho natural para leitor de código de barras: se
   o vendedor "digitar" (ou o leitor USB simular digitação de) um EAN
   completo no campo de produto, o sistema deveria reconhecer que aquilo é
   um código e não um texto de busca livre, e preencher o produto
   automaticamente sem exigir clique em sugestão (já que o EAN identifica
   o produto de forma inequívoca por definição, diferente de um nome).

**Sobre a sugestão de "campo de descrição" adicional:**

O usuário perguntou se não seria bom ter também um campo de descrição.
Hoje já existe `descricao` (usado como o "nome" que aparece no
autocomplete) — a lacuna real não é a ausência de um campo de descrição,
e sim a ausência de um campo de **descrição curta/alternativa** (Bling
`AP Descrição Curta`) e da própria falta de peso do `codigo` na busca (ver
acima). Registrado como parte do Grupo 1/6.3.

### 6.5 Justificativa geral para manter a maioria dos campos "implícitos" (invisíveis por padrão)

O usuário pediu bons argumentos para sustentar a posição de deixar boa
parte dessas colunas implícitas — seguem os principais, para constar:

1. **Fricção de digitação é o maior risco de abandono do sistema no
   balcão real.** Um petshop pequeno/médio não tem um funcionário de
   cadastro dedicado; é o próprio vendedor, no meio de um atendimento, que
   vai cadastrar o produto. Cada campo obrigatório extra é um motivo para
   a pessoa desistir de usar o sistema corretamente e "malandrar" um
   cadastro incompleto ou usar outro caderno/planilha em paralelo — que é
   exatamente o problema que o software deveria resolver (regra 19 do
   documento de regras de negócio: simplicidade acima de tudo).
2. **A maioria das colunas fiscais avançadas (ICMS-ST, CEST, FCI, IPI
   fixo, tributos) tem baixíssima variância produto a produto dentro do
   MESMO petshop** — geralmente seguem o regime tributário da loja como
   um todo, não mudam item a item na prática do dia a dia. Faz mais
   sentido tratá-las como configuração da loja/categoria (preenchida uma
   vez, aplicada em lote) do que como campo repetido em cada produto —
   isso é uma melhoria de modelagem a se considerar quando a integração
   Bling for implementada de fato, não apenas "esconder o campo".
3. **Boa parte dessas colunas só existe por causa de canais que a loja
   ainda não usa** (e-commerce, marketplace, frete calculado, múltiplos
   fornecedores com catálogo próprio). Enquanto a operação for só balcão
   físico, esses campos são custo puro de preenchimento sem benefício
   percebido — o sistema deve crescer para suportá-los quando (e se) a
   loja de fato vender online, não antes.
4. **O plano de importação de banco de dados (regra 25 já registrada)**
   prevê que boa parte desses dados venha PRONTA de uma base de produtos
   de petshop pré-carregada ou da própria sincronização com o Bling —
   ou seja, o dono/vendedor não vai digitar manualmente NCM, GTIN, peso
   bruto etc. na maioria das vezes; esses dados chegam junto do produto
   quando ele é importado/sincronizado. Expor tudo isso como campo
   editável desde já seria otimizar para um cenário (cadastro 100%
   manual) que é a exceção, não a regra, no fluxo real planejado.
5. **Gaveta ≠ ausência.** Nenhum dado é perdido — o padrão já usado no
   projeto (endereço do responsável, dados fiscais avançados) é manter o
   campo disponível dentro de uma seção expansível, então a pessoa que
   realmente precisa de um campo raro (ex: CEST para um estado que exige
   substituição tributária) consegue preenchê-lo sem que ele apareça por
   padrão para os 95% dos usuários que nunca vão precisar dele.

### 6.6 Resumo do que muda no arquivo `produtos.json` quando isso for implementado

Não implementado agora — só a decisão de esquema fica registrada:

- Campos que passam a ser de primeira classe (fora de `bling_extra`,
  visíveis fora de gaveta): `estoque_maximo` (novo).
- Campos que entram como visíveis, mas em gaveta "Dados fiscais" do
  cadastro de produto: `ncm`, `origem`, `gtin_ean`, `preco_custo`.
- Todo o restante das 59 colunas entra dentro de `bling_extra` (objeto já
  existente e vazio por produto), nomeado com chaves em snake_case
  equivalentes (ex: `bling_extra.cest`, `bling_extra.peso_bruto_kg`,
  `bling_extra.gtin_ean_embalagem`), preservando compatibilidade total com
  o cadastro atual.
- `codigo` (já existente) passa a ser usado ativamente na busca do
  autocomplete, não só exibido como texto informativo.

---

## 7. Bloco novo de pendências (28/07/2026, segunda rodada) — bipagem, desconto, código interno, gerenciar e Inteligência

Registrado após confirmação do usuário sobre uso de Cosmos/Bluesoft,
desconto por item, código de barras interno para produtos a granel,
bipagem em Venda/Estoque, três painéis em Gerenciar, e a página de
Inteligência. As regras de negócio completas (com exemplos) estão em
`docs/regras-negocio.md`, regras 26 a 35. Resumo do que muda em cada
tela quando isso for implementado:

- **Cadastro de Produto**: adicionar campo obrigatório de preço de venda
  desde já (regra 27); adicionar ação "Gerar código de barras" com
  download/reimpressão (regra 29); casamento por EAN com
  `catalogo_externo.json` baixado offline (regra 26).
- **Venda**: manter leiaute atual; campo de produto passa a aceitar
  bipagem (Enter automático do leitor) além de digitação manual (regra
  30); cada item de produto ganha um botão de desconto percentual
  (regra 28), com recálculo de total antes de confirmar.
- **Estoque**: mesma lógica de bipagem da Venda (regra 30); a baixa por
  venda/saída deve decrementar lotes/entradas específicos por
  FIFO de validade, não um contador agregado (regra 31) — isso é uma
  mudança de modelagem de dados, não só de tela, e precisa ser
  considerada quando o storage real (banco de dados) for implementado.
- **Gerenciar/Cadastros**: reestruturar em três painéis verticais
  (Cliente, Pet, Produto), cada um mostrando o registro completo com
  relações editáveis (regra 34) — hoje a tela não tem essa separação.
- **Inteligência**: construir do zero seguindo os princípios da regra 35
  (minimalista, direto, correlações que gerem lucro) — nenhuma
  implementação existe ainda para essa página.
- **Hardware**: leitor de código de barras dedicado da loja e maquininha
  de cartão ficam para o final, mas já registrados (regra 32) — perguntar
  ao dono o modelo exato de cada equipamento antes de iniciar essa parte.

