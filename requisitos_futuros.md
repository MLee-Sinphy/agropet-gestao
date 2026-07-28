## Requisitos Futuros - Agropet Gestão

### 1. Seleção de Tipo de Quantidade
- Implementar slider/botão para alternar entre:
  - **Unidade** (venda por item individual)
  - **Granel** (venda por peso/volume)
- Interface deve mostrar:
  - Quantidade de sacos (quando em granel)
  - Porção unitária (quando por unidade)

### 2. Integração com Bling
- **Objetivo:** Emissão automática de NFe ao finalizar venda
- **Etapas:**
  1. Criar conta Bling do cliente
  2. Desenvolver integração via API
  3. Mapear campos:
     - Produtos → Códigos Bling
     - Clientes → Cadastro Bling
  4. Alterar fluxo:
     - "Salvar venda" → "Efetuar venda" (dispara NFe)

### 3. Ícone de Configurações
- **Localização:** Canto superior direito (ícone redondo)
- **Função:** Acessar página com:
  - Dados da empresa (CNPJ, endereço)
  - Configurações Bling (API key, configurações NF)
  - Outras configurações do sistema

### 4. Base de Dados Inicial
- Criar catálogo inicial com:
  - Produtos comuns de petshop
  - Dados necessários para NFe (NCM, unidades de medida)

---
**Última atualização:** 28/07/2026
