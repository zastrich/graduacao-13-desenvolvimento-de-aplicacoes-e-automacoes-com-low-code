# Guia de Operação para IA: Automação e Criação de Fluxos no n8n via MCP Playwright

Este documento contém o passo a passo técnico e os padrões de navegação que a IA deve seguir utilizando o **MCP Playwright** para interagir com a interface web do n8n e criar dinamicamente novos workflows.

---

## 1. Pré-requisitos de Acesso e Variáveis de Ambiente
Antes de iniciar qualquer interação via Playwright, certifique-se de que os seguintes dados estão configurados no contexto da IA:
* `N8N_URL`: URL base da instância (ex: `http://localhost:5678` ou URL de produção).
* `N8N_EMAIL` / `N8N_PASSWORD`: Credenciais de login (se aplicável).
* `LLM_API_KEY`: Chave de API para o nó de IA (OpenAI, Anthropic ou Ollama interno) que estruturará o JSON do fluxo.

---

## 2. Estrutura do Fluxo Principal (Meta-Fluxo)

O Fluxo Principal deve seguir a seguinte arquitetura lógica dentro do n8n:
```mermaid
[ Webhook / Formulário Inicial ]
│
▼
[ Nó de IA (LLM / Advanced AI) ] ──(Gera o JSON do novo fluxo via Prompt)
│
▼
[ Nó Code / Function ] ──(Valida e injeta o JSON gerado na API do n8n)
│
▼
[ Resposta ao Usuário / Log de Sucesso ]
```

### Passo a Passo para o Playwright Construir o Fluxo Principal:

#### Passo 2.1: Acesso ao n8n e Autenticação
1. **Navegar** para `N8N_URL`.
2. Se houver tela de login, preencher os campos de e-mail e senha utilizando seletores estáveis (`input[name="email"]`, `input[name="password"]`).
3. Clicar no botão de login (`button[type="submit"]`) e aguardar o carregamento do painel principal (`/workflows`).

#### Passo 2.2: Criar um Novo Workflow
1. Clicar no botão **"Add workflow"** ou **"Create workflow"** (geralmente localizado no canto superior direito ou menu lateral).
2. Renomear o workflow clicando no título padrão (topo esquerdo) e definindo como: `[Meta] Criador Automático de Fluxos via LLM`.

#### Passo 2.3: Adicionar os Nós Essenciais
Para cada nó abaixo, utilize a busca de nós do n8n (`Tab` ou botão **"+"** / **"Add first node"**):

1. **Nó de Entrada (Webhook ou Form Trigger):**
   * *Busca:* `Webhook` ou `n8n Form Trigger`.
   * *Configuração:* Definir o método como `POST` (para Webhooks) ou configurar os campos básicos do formulário de requisição (ex: "Qual automação você deseja criar?").

2. **Nó de IA (Advanced AI -> LangChain / Basic LLM Chain):**
   * *Busca:* `Advanced AI` ou `OpenAI / Anthropic` (conforme disponibilidade da instância).
   * *Prompt System:* Configurar o System Prompt da LLM com as regras estritas da estrutura JSON de um workflow do n8n (nodes e connections). Instrua a LLM a retornar **apenas** o JSON válido do fluxo n8n solicitado pelo usuário.

3. **Nó de Execução / Criação via API do n8n (HTTP Request ou Code):**
   * *Busca:* `HTTP Request`.
   * *Configuração:* 
     * **Method:** `POST`
     * **URL:** `{{ $env.N8N_VERSION ? 'http://localhost:5678/api/v1/workflows' : '' }}` (ou endpoint interno da API do n8n).
     * **Authentication:** Header Auth com a chave de API do n8n (`X-N8N-API-KEY`).
     * **Body:** O JSON gerado pela LLM no passo anterior.

---

## 3. Diretrizes para Interação Humana e Formulários Dinâmicos

Como o fluxo principal prevê interações humanas antes de criar o fluxo final, configure o nó de formulário para capturar requisitos refinados:

1. **Formulário de Especificação:** Utilize o nó **n8n Form Trigger** para coletar:
   * *Nome do fluxo desejado.*
   * *Gatilho inicial* (ex: Webhook, Agendamento/Cron, Email).
   * *Ações esperadas* (ex: Enviar mensagem no Slack, salvar no Airtable, disparar HTTP Request).
2. **Etapa de Aprovação Humana (Opcional):**
   * Adicione o nó **Wait** configurado para aguardar um webhook de aprovação ou utilize nós de aprovação por e-mail/chat antes de efetivar a criação do fluxo na API.

---

## 4. Instruções de Execução via Playwright (Boas Práticas)

Quando a IA acionar o **MCP Playwright** para manipular a interface, siga estas regras de robustez:

* **Timeouts e Esperas:** Sempre utilize `page.waitForSelector()` com tempos limite adequados (ex: 5000ms) após clicar em botões de salvamento ou abertura de modais.
* **Seletores Resilientes:** Prefira usar atributos de teste do n8n (`data-test-id`) ou seletores baseados em texto visíveis (`text=Save`, `text=Execute Workflow`) quando classes CSS dinâmicas mudarem.
* **Tratamento de Erros:** Caso ocorra um erro de validação no JSON gerado pela LLM, o Playwright deve capturar o texto do alerta na interface do n8n, repassar para o contexto da LLM corrigir o JSON e tentar novamente o salvamento.

---

## 5. Exemplo de Prompt Interno para a LLM do Meta-Fluxo

Abaixo está o modelo de prompt que a IA inserirá no nó de IA do n8n para que ele saiba gerar novos fluxos corretamente:

```text
Você é um arquiteto especialista em automações n8n. Com base na solicitação do usuário: "{{ $json.body.user_request }}", gere estritamente um objeto JSON válido contendo a estrutura de um workflow do n8n com as chaves "nodes" e "connections". 
Certifique-se de usar IDs únicos para os nós e posições (coordinates x, y) organizadas para que o fluxo fique visualmente limpo. Não inclua texto adicional fora do bloco JSON.