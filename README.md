# **Graduação IA e Automação Digital**

## _Trabalho para a disciplina de Desenvolvimento de Aplicações e Automações com Low Code_

### **Meta-Fluxo: Criador Automático de Fluxos n8n via LLM**

Uma automação **low-code no n8n** que cria **outras automações** a partir de linguagem natural. A pessoa descreve, num formulário, a automação que deseja; o **ChatGPT (OpenAI)** gera o JSON do workflow; o sistema valida e sanitiza esse JSON contra um catálogo curado de nós; mostra uma **pré-visualização** para revisão humana; e, após aprovação, **cria o workflow de verdade** na instância do n8n via a API nativa.

> **Nota sobre o escopo.** Todo o fluxo roda numa **instância do n8n versionada dentro do próprio projeto** (`n8n@2.43.8`, pasta `n8n/instancia/`), independente de qualquer n8n global da máquina. A estrutura dos fluxos foi construída via a API do n8n, e a lógica pesada (montagem de prompt, validação/sanitização e pré-visualização) vive em **Code nodes** gerados a partir de TypeScript testado (`scripts/`).

## Vídeo de demonstração (Pitch)

[![Watch the video](https://img.youtube.com/vi/WNkb3f7SCyM/maxresdefault.jpg)](https://youtu.be/WNkb3f7SCyM)

## O Problema

Montar automações no n8n exige conhecer os nós certos, suas versões, a forma das conexões e os parâmetros obrigatórios. Para quem está começando, a barreira é a tradução entre "o que eu quero" e "a estrutura JSON que o n8n espera". O objetivo deste trabalho é remover essa barreira: deixar a pessoa descrever a intenção e ter um fluxo pronto, revisável e seguro, sem escrever JSON.

## A Solução

1. **Descrever em linguagem natural.** Um formulário n8n coleta nome, gatilho, ações e detalhes.
2. **Gerar com LLM.** Um sub-workflow (o Núcleo) monta um prompt com um catálogo curado de nós e pede ao ChatGPT um JSON de workflow.
3. **Validar e sanitizar.** Um Code node confere tipos/versões contra o catálogo, valida conexões e parâmetros obrigatórios, remove campos proibidos, gera IDs e recalcula posições para um canvas limpo.
4. **Autocorrigir.** Se a validação falhar, os erros voltam ao prompt e o ChatGPT tenta de novo (até 3 vezes).
5. **Revisar com humano.** Uma página de formulário mostra a prévia (nós, fluxo, avisos) e pede a decisão: Aprovar, Ajustar (com feedback) ou Cancelar.
6. **Criar de verdade.** Aprovado, o nó nativo **n8n** cria o workflow via API; a pessoa recebe o link para abri-lo no editor.

## Arquitetura

O sistema tem dois workflows: o **Núcleo Gerador** (sub-workflow reutilizável, com um webhook de testes) e o **Criador** (a interface humana, que chama o Núcleo).

### Núcleo Gerador

```mermaid
flowchart LR
  T1["Execute Sub-workflow Trigger"] --> N["Normalizar Entrada"]
  T2["Webhook dry-run (Header Auth)"] --> N
  N --> MP["Code: Montar Prompt"]
  MP --> LLM["Basic LLM Chain + ChatGPT (OpenAI)"]
  LLM --> V["Code: Validar e Sanitizar"]
  V --> OK{"ok?"}
  OK -- sim --> S1["Saída Sucesso"]
  OK -- não --> TT{"pode repetir?"}
  TT -- sim --> R["Nova Tentativa"] --> MP
  TT -- não --> S2["Saída Falha"]
```

### Criador Automático de Fluxos

```mermaid
flowchart LR
  FT["Form: Solicitar"] --> ES["Estado"]
  ES --> SUB["Chamar Núcleo"]
  SUB --> OK2{"gerou?"}
  OK2 -- não --> E1["Fim: Falha"]
  OK2 -- sim --> PV["Code: Pré-visualização"]
  PV --> REV["Form: Revisão"]
  REV --> SW{"Decisão"}
  SW -- Aprovar --> CR["n8n: Criar Workflow"]
  CR -- sucesso --> E2["Fim: Sucesso (link)"]
  CR -- erro --> NR["Nova Rodada"]
  SW -- Ajustar --> NR
  NR --> LIM{"rodada <= 3?"}
  LIM -- sim --> SUB
  LIM -- não --> E3["Fim: Limite"]
  SW -- Cancelar --> E4["Fim: Cancelado"]
```

## Stack Tecnológica

| Camada | Tecnologia | Papel |
|---|---|---|
| Orquestração low-code | n8n 2.43.8 (instância local do projeto) | Executa os dois meta-fluxos |
| LLM | ChatGPT / OpenAI (`gpt-4o-mini`) | Gera o JSON do workflow (escolhido pela maior precisão) |
| Nós de IA | LangChain (`chainLlm` + `lmChatOpenAi`) | Basic LLM Chain + OpenAI Chat Model |
| Lógica dos Code nodes | Node.js + TypeScript (transpilado para JS) | Montar prompt, validar/sanitizar, pré-visualizar |
| Automação/ferramental | TypeScript + `tsx` + Public API do n8n | Montagem, credenciais, dry-run, export |
| Testes | `node:test` (`tsx --test`) | 64 testes unitários + sandbox dos Code nodes |

## Integrações / Ferramentas

| Integração | Protocolo | Autenticação | Função |
|---|---|---|---|
| OpenAI (ChatGPT) | REST (via nó LangChain) | Credencial `openAiApi` | Geração do JSON do workflow |
| API do n8n | REST `/api/v1` | Credencial `n8nApi` (`X-N8N-API-KEY`) | Criar o workflow aprovado |
| Webhook dry-run | HTTP POST | Header Auth `X-Dry-Run-Token` | Testar o Núcleo por script |
| Formulário n8n | HTTP (form) | — (aberto; Basic Auth opcional) | Interface humana |
| Google Sheets | OAuth2 | Credencial `googleSheetsOAuth2Api` | Ler/gravar a base de férias |
| Gmail | OAuth2 | Credencial `gmailOAuth2` | Envio real de e-mails |
| Trello | API Key + Token | Credencial `trelloApi` | Criar/mover/comentar cards |

## Funcionamento (detalhes técnicos)

- **Catálogo curado** (`n8n/catalogo/`): 24 nós permitidos (6 gatilhos + 18 ações), cada um com `type`, `typeVersion` real da instância, categoria, descrição, parâmetros obrigatórios e exemplo. A LLM só pode usar esses nós; o validador rejeita qualquer outro.
- **Validação e sanitização**: extrai o JSON (mesmo entre cercas ```` ```json ````), confere tipos/versões/conexões/obrigatórios, exige ao menos um gatilho, gera `id`/`webhookId`, força `settings.executionOrder = v1`, prefixa o nome com `[IA]`, remove campos que a API recusa e recalcula posições em camadas.
- **Code nodes gerados**: o código roda no task runner do n8n (sem `require`, `process` ou `$env`). Os bundles em `n8n/code/` são gerados por `scripts/n8n/build-code-nodes.ts` a partir das libs TypeScript e testados em sandbox (`node:vm`).
- **Autocorreção**: os erros de validação voltam ao prompt como "Erros da tentativa anterior", e o ChatGPT tenta de novo (até 3 vezes). Pedidos inviáveis retornam `impossivel: true` e não entram em loop.

## Como Executar

Pré-requisitos: Node.js entre 20.19 e 24.x. A porta 5678 precisa estar livre (encerre qualquer n8n global).

```bash
# 1. Instalar dependências
cd scripts && npm install
npm run n8n:install          # instala o n8n 2.43.8 em n8n/instancia/

# 2. Subir a instância local (deixe rodando)
npm run n8n:start            # http://localhost:5678
```

1. **Criar a conta owner** no primeiro acesso a `http://localhost:5678`.
2. **Criar a API key** em Settings → n8n API e preencher `scripts/.env` (veja `scripts/.env.example`): `N8N_URL`, `N8N_API_KEY`, `DRY_RUN_TOKEN` e `OPENAI_API_KEY`.
3. **Importar os workflows** versionados:

   ```bash
   npm run n8n:import         # importa n8n/workflows/*.json (preserva os IDs)
   ```

4. **Recriar as credenciais** (uma vez), que não são versionadas:

   ```bash
   npx tsx n8n/criar-credenciais.ts     # Header Auth, Basic Auth
   npx tsx n8n/criar-cred-openai.ts     # credencial OpenAI (ChatGPT)
   npx tsx n8n/criar-cred-n8napi.ts     # credencial da API do n8n
   ```

5. **Publicar** o Núcleo e o Criador (ou rodar `npx tsx n8n/ativar-workflow.ts <id>`).
6. **Usar**: abra `http://localhost:5678/form/criador-de-fluxos`, descreva a automação e siga a revisão.

### Testes e utilitários

```bash
cd scripts
npm test                       # 64 testes (libs + Code nodes em sandbox)
npm run build:n8n              # regenera os Code nodes de n8n/code/
npm run n8n:ping               # testa a conexão com a API
npm run n8n:catalogo           # regenera o catálogo de nós
npm run n8n:dry-run -- pedido-01   # testa o Núcleo com um pedido de exemplo
npm run n8n:export             # exporta os workflows do manifesto
npm run n8n:verificar-restauracao  # confere a integridade dos exports
```

## Screenshots

### Núcleo Gerador (canvas)
![Núcleo Gerador](assets/prints/01-nucleo-gerador-canvas.png)

### Criador Automático de Fluxos (canvas)
![Criador](assets/prints/02-criador-canvas.png)

### Formulário de solicitação
![Formulário](assets/prints/03-formulario-solicitacao.png)

### Página de revisão (pré-visualização + decisão)
![Revisão](assets/prints/04-revisao-preview.png)

### Lista de workflows na instância
![Workflows](assets/prints/05-lista-workflows.png)

### Credenciais configuradas
![Credenciais](assets/prints/06-credenciais.png)

## Fluxos de demonstração (gerados/integrados)

Além do meta-fluxo, dois fluxos completos foram construídos para demonstrar integrações reais. Ambos reutilizam o modelo de IA (OpenAI `gpt-4o-mini`) já configurado.

### 1. `[IA] Aprovação de Férias` (Google Sheets + Gmail)

Formulário de solicitação → leitura da planilha Google Sheets (abas `colaboradores` e `ferias`) → nó de cálculo determinístico das regras → a IA redige a decisão → If → aprovação manual do gestor (com resumo da solicitação na tela) → registro das férias concedidas de volta na planilha → e-mail real via Gmail. Há caminhos de **reprovação automática** e **reprovação pelo gestor**, ambos notificando o colaborador por e-mail com o motivo.

**Integrações:** Google Sheets (leitura e escrita), Gmail (envio real), OpenAI.

| Evidência | Print |
|---|---|
| Canvas do fluxo | ![Canvas Férias](assets/prints/evidencia-canvas-ferias-final.png) |
| Planilha — colaboradores | ![Colaboradores](assets/prints/evidencia-planilha-colaboradores.png) |
| Planilha — férias | ![Férias](assets/prints/evidencia-planilha-ferias.png) |
| Página de aprovação do gestor | ![Gestor](assets/prints/evidencia-pagina-gestor.png) |
| Gestor aprovando | ![Aprovar](assets/prints/evidencia-pagina-gestor-aprovar.png) |
| Gestor reprovando (com motivo) | ![Reprovar](assets/prints/evidencia-pagina-gestor-reprovar.png) |
| E-mail ao gestor (nó Gmail, SENT) | ![E-mail gestor](assets/prints/evidencia-email-gestor-no.png) |
| E-mail de reprovação automática | ![Reprova auto](assets/prints/evidencia-email-reprova-auto-no.png) |
| E-mail de reprovação do gestor | ![Reprova gestor](assets/prints/evidencia-email-reprova-gestor-no.png) |

### 2. `[IA] Triagem de Reclamações` (Typeform→Form n8n + Trello + Gmail)

Formulário de reclamação (nome, e-mail, assunto, descrição) → cria card no Trello na lista **N1 - Atendimento Chatbot** → lê os cards abertos do quadro (N1/N2/N3) como **insumo** para a IA → a IA avalia a reclamação à luz dos chamados já abertos e decide o encaminhamento → move o card, comenta nele e envia e-mail ao cliente. Três caminhos:

- **resolvido:** a IA responde direto, move para **Concluído**;
- **humano:** encaminha para **N2 - Atendimento Humano** com prazo de 48h;
- **em_andamento:** detecta que o problema já existe (mesmo bug) e responde conforme o status onde já está (**N2** ou **N3 - Desenvolvimento**).

Em todos os casos: comentário registrado no card + e-mail ao cliente.

> **Nota sobre o Typeform:** o enunciado previa o Typeform como coletor. Como webhooks/integração do Typeform exigem plano pago, o gatilho foi implementado com o **n8n Form Trigger** (mesma função, sem custo). Em produção, bastaria trocar o gatilho pelo Typeform Trigger.

**Integrações:** Trello (criar card, ler cards, comentar, mover de lista), Gmail (envio real), OpenAI.

| Evidência | Print |
|---|---|
| Canvas do fluxo | ![Canvas Reclamações](assets/prints/evidencia-canvas-reclamacoes.png) |
| Formulário de reclamação | ![Form reclamação](assets/prints/evidencia-form-reclamacao.png) |
| Quadro do Trello (roteamento) | ![Trello board](assets/prints/evidencia-trello-board.png) |
| Card com comentário da IA | ![Card comentário](assets/prints/evidencia-trello-card-comentario.png) |

## Estrutura

```text
.
├── PLANO.md                      # guia de operação original (referência de escopo)
├── PLANO-IMPLEMENTACAO.md        # plano vivo com o log de todas as etapas
├── README.md                     # este arquivo
├── n8n/
│   ├── instancia/                # n8n 2.43.8 do projeto (.n8n/ e node_modules/ fora do git)
│   ├── catalogo/                 # catálogo curado de nós + versões reais
│   ├── code/                     # Code nodes gerados (montar-prompt, validar, preview)
│   ├── exemplos/                 # pedidos de teste (dry-run)
│   └── workflows/                # JSONs exportados + manifesto
└── scripts/
    └── n8n/
        ├── lib/                  # env, api, catalogo, validar-workflow, montar-prompt, preview-html, layout, uuid
        ├── entradas/             # trechos de entrada dos Code nodes
        ├── tests/                # testes (node:test)
        ├── montar-nucleo.ts      # monta o Núcleo via API
        ├── montar-criador.ts     # monta o Criador via API
        ├── build-code-nodes.ts   # gera n8n/code/*.js
        ├── dry-run.ts            # testa o Núcleo pelo webhook
        └── ...                   # ping, export, credenciais, etc.
```

## Autor

Trabalho da Graduação em IA e Automação Digital — disciplina de Desenvolvimento de Aplicações e Automações com Low Code.
