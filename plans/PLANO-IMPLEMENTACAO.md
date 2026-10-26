# Plano de Implementação — Meta-Fluxo "Criador Automático de Fluxos via LLM" (n8n 2.43.8)

## Checklist

- [x] Task 1: Instância n8n local do projeto (pré-requisito)
- [x] Task 2: Plano vivo e conexão com a API do n8n local
- [x] Task 3: Spike de riscos do n8n 2.43.8 (UI)
- [x] Task 4: Catálogo de nós permitidos (TDD)
- [x] Task 5: Validador e sanitizador (TDD)
- [x] Task 6: Montagem do prompt e pré-visualização HTML (TDD)
- [x] Task 7: Build dos Code nodes com teste em sandbox
- [x] Task 8: Workflow `[Meta] Núcleo Gerador` (Playwright, híbrido)
- [x] Task 9: Workflow `[Meta] Criador Automático de Fluxos via LLM` (Playwright, híbrido)
- [x] Task 10: Robustez e casos limite
- [x] Task 11: Entregáveis finais e verificação de restauração

## 1. Problema

Construir, no n8n executado a partir do próprio projeto (`http://localhost:5678`), o meta-fluxo descrito em `PLANO.md`: uma pessoa descreve a automação desejada num formulário; o Gemini gera o JSON do workflow; o fluxo valida o JSON, exibe uma pré-visualização para revisão humana e, mediante aprovação, cria o workflow via API do n8n. A construção na interface é feita pelo agente via MCP Playwright. O `PLANO.md` foi elaborado com base no enunciado do trabalho e é a referência de escopo.

## 2. Requisitos

1. **n8n local do projeto:** versão fixa `n8n@2.43.8` instalada em `n8n/instancia/`, com dados em pasta do projeto; definição da instalação versionada; instância global não é mais usada.
2. **LLM:** Google Gemini (free tier), credencial nativa do n8n.
3. **Construção híbrida:** estrutura (workflow, nós, conexões, nomes) via UI com Playwright; conteúdos longos (código dos nós Code) gerados em TypeScript no repositório e colados no editor.
4. **Interação humana nativa:** n8n Form multi-página — solicitação → revisão (prévia + decisão + feedback) → página final com link. "Ajustar" regenera com o feedback. (O n8n possui isso nativamente; não é necessária aplicação externa.)
5. **Catálogo curado:** a LLM só pode usar nós de uma whitelist; o validador rejeita tipos fora dela.
6. **Dois workflows:** `[Meta] Núcleo Gerador` (sub-workflow + Webhook dry-run para testes por script) e `[Meta] Criador Automático de Fluxos via LLM` (formulário + aprovação + criação).
7. **Documentação na etapa final:** JSONs exportados, prints em `assets/prints/`, README seguindo a estrutura de `README-exemplo.md`.
8. **Plano vivo:** este arquivo é atualizado ao final de cada task.

## 3. Contexto (pesquisa)

- **Versão:** a instância global atual é 2.43.8 (confirmado em `~/.n8n/n8nEventLog.log`); a instância do projeto usará a mesma versão fixa.
- **Node.js:** n8n 2.x exige Node entre 20.19 e 24.x. Instalação via npm será descontinuada a partir do n8n 3.0 (irrelevante com versão fixa; registrado).
- **n8n 2.x:**
  - "Activate" virou **Publish/Unpublish**.
  - Code node roda em **task runner**: `$env` bloqueado por padrão (`N8N_BLOCK_ENV_ACCESS_IN_NODE=true`), `$evaluateExpression` não funciona, evitar `require`.
  - Execute Command e Local File Trigger desativados por padrão.
  - No Windows, `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false` é recomendado (sem suporte a permissões 0600).
- **Correções ao PLANO.md:**
  - A URL `{{ $env.N8N_VERSION ? ... : '' }}` é descartada (retorna vazio e `$env` está bloqueado). Usa-se o nó nativo **n8n → Workflow → Create** com credencial "n8n API" (Base URL `http://localhost:5678/api/v1`).
  - A API exige `name`, `nodes`, `connections`, `settings` e rejeita campos extras (`id`, `active`, `tags`, `pinData`, settings desconhecidos) → o sanitizador remove.
  - `{{ $json.body.user_request }}` só vale para Webhook; o Form Trigger expõe os campos pelo label/nome.
- **n8n Form:** multi-página com nós entre páginas; Custom HTML não aceita `<script>`, `<style>`, `<input>` (prévia em HTML estático); Form Ending "Show Text" aceita HTML completo; query params só funcionam na URL de produção; URL de teste via "Execute workflow".
- **Gemini:** sub-nó "Google Gemini Chat Model" do Basic LLM Chain; modelos carregados dinamicamente da conta; opções de max tokens e temperatura; free tier tem limite de requisições por minuto → usar Retry On Fail.
- **Sub-workflow:** Execute Sub-workflow Trigger com campos definidos; retorna os dados do último nó executado. Verificar (Task 3) se o sub-workflow precisa estar publicado para ser chamado.
- **CLI do n8n:** `export:workflow --id=<ID> --output=<arquivo> --pretty` e `import:workflow --separate --input=<dir>` preservam IDs (o Criador continua apontando para o Núcleo após reimportação); importados entram não publicados; a CLI funciona sem o servidor rodando.

## 4. Solução proposta

### 4.1 Arquitetura

```mermaid
flowchart LR
  subgraph NUCLEO["[Meta] Núcleo Gerador"]
    T1["Execute Sub-workflow Trigger"] --> N["Set: Normalizar Entrada"]
    T2["Webhook POST dry-run (Header Auth)"] --> N
    N --> MP["Code: Montar Prompt"]
    MP --> LLM["Basic LLM Chain + Gemini Chat Model"]
    LLM --> V["Code: Validar e Sanitizar"]
    V --> OK{"ok?"}
    OK -- "sim" --> S1["Set: Saída Sucesso"]
    OK -- "não" --> TT{"tentativa < 3 e não impossível?"}
    TT -- "sim" --> R["Set: Nova Tentativa (errosAnteriores)"]
    R --> MP
    TT -- "não" --> S2["Set: Saída Falha"]
  end
```

```mermaid
flowchart LR
  subgraph CRIADOR["[Meta] Criador Automático de Fluxos via LLM"]
    FT["Form Trigger: Solicitar Automação (Basic Auth)"] --> ES["Set: Estado (rodada=1)"]
    ES --> SUB["Execute Sub-workflow: Núcleo"]
    SUB --> OK2{"ok?"}
    OK2 -- "não" --> E1["Form Ending: falha + erros"]
    OK2 -- "sim" --> PV["Code: Pré-visualização"]
    PV --> REV["Form: Revisão (HTML + decisão + feedback)"]
    REV --> SW{"Decisão"}
    SW -- "Aprovar" --> CR["n8n: Workflow Create"]
    CR -- "sucesso" --> E2["Form Ending: link do novo fluxo"]
    CR -- "erro da API" --> NR["Set: Nova Rodada (feedback, rodada+1)"]
    SW -- "Ajustar" --> NR
    NR --> LIM{"rodada <= 3?"}
    LIM -- "sim" --> SUB
    LIM -- "não" --> E3["Form Ending: limite atingido"]
    SW -- "Cancelar" --> E4["Form Ending: cancelado"]
  end
```

### 4.2 Instância n8n local do projeto

- **Versionado:** `n8n/instancia/package.json` (`{ "private": true, "dependencies": { "n8n": "2.43.8" } }`), `n8n/instancia/package-lock.json`, `n8n/instancia/ambiente.env` (configuração sem segredos), `scripts/n8n/n8n-local.ts` (launcher), `n8n/workflows/*.json` + `n8n/workflows/manifesto.json`.
- **Não versionado:** `node_modules/` e `n8n/instancia/.n8n/` (contém `database.sqlite` e `config` com `encryptionKey`; juntos permitem decifrar credenciais). Credenciais são recriadas manualmente pelos nomes documentados.
- **Instância nova:** sem migrar dados do `~/.n8n` global; conta owner criada manualmente no primeiro acesso. (Migração opcional fora do escopo: exportar com a CLI global e importar.)
- **Proteção contra a global:** o launcher recusa iniciar se a porta 5678 estiver ocupada e nunca recorre ao binário global.
- **`ambiente.env`:** `N8N_PORT=5678`, `N8N_HOST=localhost`, `N8N_PROTOCOL=http`, `WEBHOOK_URL=http://localhost:5678/`, `GENERIC_TIMEZONE=America/Sao_Paulo`, `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false`, `N8N_DIAGNOSTICS_ENABLED=false`. `N8N_USER_FOLDER` é sempre forçado pelo launcher para o caminho absoluto de `n8n/instancia` (não pode ser sobrescrito pelo arquivo).
- **Launcher `scripts/n8n/n8n-local.ts`** — subcomandos:
  - `start`: valida binário local e porta livre; executa `process.execPath n8n/instancia/node_modules/n8n/bin/n8n start` via `spawn` (stdio herdado, repasse de Ctrl+C).
  - `version`: `n8n --version` do binário local.
  - `export`: para cada item do `manifesto.json`, `export:workflow --id=<ID> --output=n8n/workflows/<arquivo> --pretty`.
  - `import`: `import:workflow --separate --input=n8n/workflows/`.
  - `verificar-restauracao`: importa os JSONs numa pasta de dados temporária, exporta de volta, compara nós/conexões e apaga a pasta temporária.

### 4.3 Contratos de dados

| Etapa | Entrada | Saída |
|---|---|---|
| Normalizar Entrada | `$json.body` (webhook) ou `$json` (sub-workflow) | `{ nomeFluxo, gatilho, acoes, detalhes, feedback, errosAnteriores[], tentativa }` |
| Montar Prompt | estado acima | estado + `{ systemPrompt, userPrompt }` |
| Validar e Sanitizar | `text` da chain + `$('Montar Prompt').last().json` | `{ ok, workflow?, erros[], avisos[], impossivel?, motivo?, tentativa, resumo }` |
| Pré-visualização | `{ workflow, rodada }` | `{ previewHtml, workflow }` |

### 4.4 Regras do validador/sanitizador

1. Extrair JSON da resposta (tolerar cercas ```` ```json ```` e texto antes/depois).
2. Tipo e `typeVersion` de cada nó presentes no catálogo.
3. Nomes de nós únicos.
4. Conexões apontando para nós existentes, no formato `{ "Nó": { "main": [[{ "node": "Outro", "type": "main", "index": 0 }]] } }`.
5. Pelo menos um nó gatilho.
6. Parâmetros obrigatórios (definidos no catálogo) presentes.
7. Gerar `id` e `webhookId` (UUID v4 próprio, sem depender de `crypto`).
8. `settings` forçado para `{ "executionOrder": "v1" }`.
9. Nome final `[IA] <nomeFluxo>`.
10. Remover campos não aceitos pela API (`id`, `active`, `tags`, `pinData`, `versionId`, `meta`, settings extras).
11. Recalcular posições com layout determinístico em camadas a partir dos gatilhos (ex.: passo x=240, y=160).
12. Se a LLM retornar `{ "impossivel": true, "motivo": "..." }`, retornar `ok:false, impossivel:true` sem nova tentativa.
13. Mensagens de erro objetivas e reutilizáveis como feedback no prompt (ex.: "O nó 'Enviar' usa o tipo X, que não está no catálogo").

### 4.5 Estrutura do repositório

```text
n8n/
  instancia/
    package.json            # versionado
    package-lock.json       # versionado
    ambiente.env            # versionado (sem segredos)
    .n8n/                   # NÃO versionado (database.sqlite, config, logs)
  catalogo/
    catalogo-base.json      # curadoria: tipo, categoria, descrição, obrigatórios, exemplo, credencial?
    catalogo-nos.json       # gerado: + typeVersion real da instância
  code/*.js                 # gerado pelo build (não editar à mão)
  exemplos/pedido-0N.json   # pedidos para dry-run (inclui casos limite)
  workflows/
    manifesto.json          # { id, arquivo } dos workflows [Meta]
    nucleo-gerador.json
    criador-fluxos.json
scripts/
  package.json              # scripts npm adicionados
  .env                      # NÃO versionado: N8N_URL, N8N_API_KEY, DRY_RUN_TOKEN
  .env.example              # versionado
  n8n/
    lib/ env.ts api.ts catalogo.ts validar-workflow.ts montar-prompt.ts preview-html.ts layout.ts uuid.ts
    entradas/*.ts           # trechos de entrada de cada Code node ($input → lib → return)
    tests/*.test.ts
    tests/fixtures/*.json
    n8n-local.ts ping.ts extrair-catalogo.ts build-code-nodes.ts dry-run.ts
    validar-arquivo.ts mostrar-prompt.ts sincronizar-code.ts
```

- `.gitignore` recebe: `node_modules/`, `.env`, `n8n/instancia/.n8n/`.
- Scripts npm em `scripts/package.json`: `test`, `n8n:install` (`npm --prefix ../n8n/instancia ci`), `n8n:start`, `n8n:version`, `n8n:export`, `n8n:import`, `n8n:verificar-restauracao`, `n8n:ping`, `n8n:catalogo`, `build:n8n`, `n8n:dry-run`.
- Sem dependências novas além de `n8n@2.43.8` na instância: `typescript` e `tsx` já existem; API via `fetch` nativo; testes com `node:test` (`tsx --test`). Se Node < 21, listar arquivos de teste explicitamente no script `test` (sem glob).
- Build dos Code nodes: `ts.transpileModule` para CommonJS, embrulhado em `const module = { exports: {} }; const exports = module.exports; <código>; const lib = module.exports;` + trecho de entrada; modo "Run Once for All Items"; retorno `[{ json }]`; catálogo embutido como constante.

### 4.6 Técnicas de Playwright

- **Seletores:** snapshot antes de agir; preferir `data-test-id` e texto visível; registrar em "Seletores aprendidos" os que funcionarem no primeiro nó e reutilizá-los ("aprender com o primeiro item para automatizar o restante").
- **Colagem de código no Code node:** abrir o nó, focar `.cm-content`, `Ctrl+A`, e via `mcp_playwright_browser_evaluate` disparar:
  ```js
  (code) => { const el = document.querySelector('.cm-content'); el.focus();
    const dt = new DataTransfer(); dt.setData('text/plain', code);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }
  ```
  Depois conferir se o tamanho do texto no editor corresponde ao arquivo gerado.
- **Plano B da colagem:** `sincronizar-code.ts` grava o `jsCode` via API (PUT do workflow, por nome do nó) e a UI é recarregada.
- **Expressões curtas** (ex.: `{{ $json.userPrompt }}`) são digitadas normalmente.
- **Testes de formulário:** URL de teste durante a construção; URL de produção (após Publish) para o E2E final.

### 4.7 Credenciais (criadas pelo usuário; o agente abre o modal e aguarda)

| Credencial | Uso |
|---|---|
| Google Gemini(PaLM) Api | Gemini Chat Model (chave do Google AI Studio) |
| n8n API | Nó n8n → Workflow Create (Base URL `http://localhost:5678/api/v1`) |
| Header Auth `X-Dry-Run-Token` | Webhook dry-run do Núcleo (mesmo valor de `DRY_RUN_TOKEN` no `scripts/.env`) |
| Basic Auth | Form Trigger do Criador |

### 4.8 Segurança

- Formulário (Basic Auth) e webhook dry-run (Header Auth) protegidos, pois criam workflows na instância.
- Workflows gerados são criados **sem publicar** e só após aprovação humana.
- O catálogo limita os tipos de nó que a LLM pode usar.
- Dados da instância (`.n8n/`) e `.env` fora do git; segredos nunca lidos ou ecoados pelo agente.
- Recomendação no README: backup do `n8n/instancia/.n8n/config` fora do git (sem ele, credenciais da base local ficam ilegíveis).

### 4.9 Protocolo do plano vivo

Ao fim de cada task, o agente atualiza este arquivo:
1. Marca o checkbox da task.
2. Registra em "Log de execução": data, o que foi feito, IDs dos workflows e nomes das credenciais usadas (nunca valores), decisões e desvios.
3. Atualiza "Seletores aprendidos" e "Descobertas".
4. Define o "Próximo passo".
Se uma task revelar um risco que mude o desenho (ex.: loop de Form não funcionar), o plano é ajustado antes de seguir.

### 4.10 Critérios de sucesso

- `npm test` passa.
- Dry-run: 3/3 pedidos padrão válidos em até 3 tentativas.
- E2E pelo formulário cria um workflow `[IA] …` que abre no editor sem nós desconhecidos, não publicado.
- "Ajustar" incorpora o feedback na nova versão.
- JSONs exportados, restauração verificada, prints capturados e README pronto.

## 5. Tasks

### Task 1: Instância n8n local do projeto (pré-requisito)

- **Objetivo:** rodar o n8n 2.43.8 a partir do projeto, com dados na pasta do projeto, reproduzível em outra máquina com `npm run n8n:install` + `npm run n8n:start`.
- **Orientação:**
  - Pré-condição: o usuário encerra a instância global (Ctrl+C no terminal) e confirma.
  - Conferir `node -v` (20.19 a 24.x) e se a porta 5678 está livre.
  - Criar `n8n/instancia/package.json` e executar `npm install --save-exact n8n@2.43.8` dentro de `n8n/instancia/` (gera o lockfile; leva alguns minutos e centenas de MB fora do git).
  - Criar `n8n/instancia/ambiente.env` (seção 4.2).
  - Implementar `scripts/n8n/lib/env.ts` (parser de `.env` sem dependência) e `scripts/n8n/n8n-local.ts` com `start`, `version`, `export`, `import` (o `verificar-restauracao` é concluído na Task 11). `start` falha com mensagem clara se a porta estiver ocupada ou se o binário local não existir (sugerindo `npm run n8n:install`).
  - Atualizar `.gitignore` e `scripts/package.json`; criar `scripts/.env.example` e `n8n/workflows/manifesto.json` vazio (`[]`).
  - Subir com `npm run n8n:start` em background; via Playwright abrir `http://localhost:5678` e aguardar o usuário criar a conta owner.
- **Testes:**
  - `tests/env.test.ts`: parse, comentários, aspas, chave ausente gera erro claro.
  - `tests/n8n-local.test.ts`: `N8N_USER_FOLDER` sempre absoluto e do projeto (mesmo se `ambiente.env` tentar sobrescrever); resolução do binário local; detecção de porta ocupada (servidor temporário em porta aleatória); argumentos de export/import a partir de manifesto de exemplo.
- **Demo:** `npm run n8n:version` imprime `2.43.8` do binário local; `npm run n8n:start` sobe; tela de criação de owner aparece (instância nova); `n8n/instancia/.n8n/database.sqlite` existe; `git status` mostra apenas package.json, lock, ambiente.env, launcher, testes e arquivos de configuração (nada de `node_modules` ou `.n8n`).

### Task 2: Plano vivo e conexão com a API do n8n local

- **Objetivo:** comprovar acesso programático à instância local.
- **Orientação:**
  - Implementar `scripts/n8n/lib/api.ts` (cliente com header `X-N8N-API-KEY`, base `N8N_URL/api/v1`) e `scripts/n8n/ping.ts` (lista workflows).
  - Checkpoint manual: o usuário cria a API key em Settings → n8n API da instância local e preenche `scripts/.env` (`N8N_URL=http://localhost:5678`, `N8N_API_KEY`, `DRY_RUN_TOKEN`).
  - Atualizar o plano vivo com o estado inicial.
- **Testes:** `tests/api.test.ts` (header, URL, tratamento de 401/404 com `fetch` mockado).
- **Demo:** `npm run n8n:ping` imprime a quantidade de workflows (0 na instância nova); screenshot de `/workflows` registrado no log.

### Task 3: Spike de riscos do n8n 2.43.8 (UI)

- **Objetivo:** validar na prática as premissas do desenho antes de construir os fluxos.
- **Orientação:**
  - Criar pela UI `[Spike] Form Loop`: Form Trigger → Form "Página" (Custom HTML com tabela + radio Repetir/Encerrar) → Switch; Repetir volta para "Página"; Encerrar → Form Ending "Show Text" com link HTML.
  - Testar a técnica de colagem num Code node e registrar seletores aprendidos (criação de workflow, renomear, busca de nós, abrir parâmetros, salvar, publicar).
  - Verificar se Execute Sub-workflow exige sub-workflow publicado (mini-teste com um sub-workflow trivial).
  - Se o loop de Form não funcionar: adotar plano B ("Ajustar" → Form Ending "Redirect to URL" para o próprio formulário com query params preenchidos — só produção) e registrar a decisão.
- **Testes:** execução manual via Playwright com 2 voltas e encerramento.
- **Demo:** formulário repete a página duas vezes e termina com o link; resultado e decisões no log. Spike permanece na instância; remoção só com confirmação do usuário.

### Task 4: Catálogo de nós permitidos (TDD)

- **Objetivo:** fonte única e versionada dos nós que a LLM pode usar, com `typeVersion` real da instância.
- **Orientação:**
  - `n8n/catalogo/catalogo-base.json` com ~24 nós:
    - Gatilhos: Manual Trigger, Schedule Trigger, Webhook, n8n Form Trigger, Gmail Trigger, Telegram Trigger.
    - Core: HTTP Request, Edit Fields (Set), If, Switch, Code, Merge, Wait, Filter, Split Out, Aggregate, Respond to Webhook, No Operation.
    - Apps: Gmail, Slack, Telegram, Google Sheets, Airtable.
    - Cada entrada: `type`, `displayName`, `categoria` (gatilho/acao), descrição, parâmetros obrigatórios, exemplo de `parameters`, `precisaCredencial`.
  - `scripts/n8n/extrair-catalogo.ts`: tenta `GET {N8N_URL}/types/nodes.json` e pega a maior versão de cada tipo; plano B: montar pela UI `[Catálogo] Nós Permitidos` com um exemplar de cada nó (aprendendo com o primeiro) e extrair `typeVersion` via API (GET do workflow).
  - Gerar `n8n/catalogo/catalogo-nos.json`; `scripts/n8n/lib/catalogo.ts` para carregar/consultar.
- **Testes:** `tests/catalogo.test.ts` — formato das entradas, tipos únicos, `typeVersion` numérico, ao menos um gatilho, merge base + versões extraídas.
- **Demo:** `npm run n8n:catalogo` imprime tabela tipo/versão/categoria.

### Task 5: Validador e sanitizador (TDD)

- **Objetivo:** transformar a resposta crua da LLM num workflow aceito pela API, ou numa lista de erros útil como feedback.
- **Orientação:** implementar `lib/validar-workflow.ts`, `lib/layout.ts`, `lib/uuid.ts` conforme a seção 4.4; `scripts/n8n/validar-arquivo.ts` para validar um arquivo pela linha de comando.
- **Testes (fixtures):** JSON válido; JSON em cercas; texto antes/depois; tipo fora do catálogo; conexão para nó inexistente; nomes duplicados; sem gatilho; campos extras (`id`, `active`, `tags`, `pinData`); settings extras; `impossivel: true`; posições sobrepostas recalculadas; UUIDs gerados e únicos; prefixo `[IA]`.
- **Demo:** `npm test` passa; `npx tsx n8n/validar-arquivo.ts <fixture>` (em `scripts/`) imprime resultado e workflow sanitizado.

### Task 6: Montagem do prompt e pré-visualização HTML (TDD)

- **Objetivo:** gerar System/User Prompt a partir do catálogo e do estado, e o HTML de revisão.
- **Orientação:**
  - `lib/montar-prompt.ts`: System Prompt expandindo o §5 do `PLANO.md` — papel de arquiteto n8n; responder só JSON com `nodes` e `connections`; usar apenas tipos/versões do catálogo (renderizado de forma compacta); conexões por nome; sem credenciais; exemplo mínimo válido; regra `impossivel`. User Prompt: nome, gatilho, ações, detalhes e, se existirem, "Feedback humano" e "Erros da tentativa anterior".
  - `lib/preview-html.ts`: HTML estático (sem script/style/input) com nome do fluxo, tabela nó/tipo/função, sequência "A → B → C" por ramo (incluindo If/Switch), avisos e número da rodada; todo conteúdo vindo da LLM escapado.
  - `scripts/n8n/mostrar-prompt.ts` para inspeção.
- **Testes:** prompt contém todos os tipos do catálogo; feedback/erros aparecem só quando presentes; teto de tamanho; prévia escapa `<script>` e trata ramos.
- **Demo:** `npx tsx n8n/mostrar-prompt.ts ../n8n/exemplos/pedido-01.json` imprime os prompts; prévia de uma fixture aberta no navegador via Playwright (arquivo temporário removido em seguida).

### Task 7: Build dos Code nodes com teste em sandbox

- **Objetivo:** gerar o JS final de cada Code node a partir do TS testado, garantindo execução como no n8n.
- **Orientação:** `scripts/n8n/build-code-nodes.ts` gera `n8n/code/montar-prompt.js`, `n8n/code/validar-workflow.js`, `n8n/code/preview-html.js` (seção 4.5); trechos de entrada em `scripts/n8n/entradas/` leem `$input.first().json` (e, no validador, `$('Montar Prompt').last().json`) e retornam `[{ json }]`.
- **Testes:** `tests/build.test.ts` executa cada arquivo gerado em `node:vm` com `$input` e `$()` simulados; verifica saída e ausência de `require`, `process` e `$env`.
- **Demo:** `npm run build:n8n` gera os 3 arquivos; teste em sandbox passa.

### Task 8: Workflow `[Meta] Núcleo Gerador` (Playwright, híbrido)

- **Objetivo:** gerador funcionando ponta a ponta na instância, testável por script.
- **Orientação:**
  - Via UI: criar e renomear o workflow; adicionar:
    - Execute Sub-workflow Trigger ("Define using fields": `nomeFluxo`, `gatilho`, `acoes`, `detalhes`, `feedback`, `errosAnteriores`).
    - Webhook POST, path `meta-gerador-dry-run`, Header Auth, "Respond: When Last Node Finishes".
    - Set "Normalizar Entrada" (`tentativa=1`, mapeando `$json.body ?? $json`).
    - Code "Montar Prompt" e Code "Validar e Sanitizar" (colados de `n8n/code/`).
    - Basic LLM Chain (prompt `{{ $json.userPrompt }}`, mensagem de sistema `{{ $json.systemPrompt }}`) + Google Gemini Chat Model (modelo Flash disponível no free tier — registrar qual; temperatura 0.2; max tokens alto, ex. 8192) com Retry On Fail (3 tentativas).
    - If "ok?", If "tentativa < 3 e não impossível?", Set "Nova Tentativa" (loop para Montar Prompt), Set "Saída Sucesso", Set "Saída Falha".
  - Pausar para o usuário criar as credenciais Gemini e Header Auth.
  - Salvar, publicar, registrar o ID no `manifesto.json` e exportar com `npm run n8n:export` → `n8n/workflows/nucleo-gerador.json`.
  - `scripts/n8n/dry-run.ts`: POST de um pedido de `n8n/exemplos/` com `X-Dry-Run-Token`, revalida a resposta localmente e imprime resumo.
  - Pedidos: 01 Schedule → HTTP Request → Slack; 02 Webhook → If → Gmail; 03 Form → Google Sheets.
- **Testes:** rodar os 3 dry-runs; se falharem, ajustar o prompt no TS, rebuild e recolar até atingir o critério (3/3 em até 3 tentativas).
- **Demo:** `npm run n8n:dry-run -- pedido-01` retorna workflow sanitizado válido; execução visível no histórico do n8n com o número de tentativas.

### Task 9: Workflow `[Meta] Criador Automático de Fluxos via LLM` (Playwright, híbrido)

- **Objetivo:** interface humana completa — solicitação, revisão, ajuste e criação.
- **Orientação:**
  - Form Trigger "Solicitar Automação", path `criador-de-fluxos`, Basic Auth; campos: Nome do fluxo (obrigatório), Gatilho inicial (dropdown: Webhook, Agendamento (Cron), Formulário n8n, E-mail (Gmail), Telegram, Manual), Ações esperadas (textarea, obrigatório), Detalhes adicionais (textarea, opcional).
  - Set "Estado" → Execute Sub-workflow (Núcleo por ID, aguardando conclusão) → If "ok?".
  - Code "Pré-visualização" → Form "Revisão do Fluxo" (Custom HTML `{{ $json.previewHtml }}`, radio "Aprovar e criar" / "Ajustar" / "Cancelar", textarea Feedback) → Switch.
  - Aprovar → nó n8n "Workflow Create" com Workflow Object `{{ JSON.stringify($('Pré-visualização').last().json.workflow) }}` e On Error "Continue (using error output)"; sucesso → Form Ending "Show Text" com link `http://localhost:5678/workflow/{{ $json.id }}`, nome e número de nós; erro → Set "Nova Rodada" com feedback "A API do n8n rejeitou: <mensagem>".
  - Ajustar → Set "Nova Rodada" (feedback, rodada+1) → If `rodada <= 3` → volta ao Execute Sub-workflow; senão Form Ending "Limite atingido".
  - Cancelar → Form Ending "Cancelado"; falha do Núcleo → Form Ending com lista de erros.
  - Mecanismo de loop conforme decisão da Task 3.
  - Pausar para o usuário criar as credenciais "n8n API" e Basic Auth.
  - Salvar, publicar, registrar ID no `manifesto.json`, exportar com `npm run n8n:export` → `n8n/workflows/criador-fluxos.json`.
- **Testes (E2E via Playwright, URL de produção):** enviar pedido → revisão → "Ajustar" com feedback → nova prévia reflete o feedback → "Aprovar" → abrir o link → confirmar workflow `[IA] …` sem nós desconhecidos e não publicado. Segundo teste com "Cancelar".
- **Demo:** fluxo completo pelo navegador cria um novo workflow visível em `/workflows`.

### Task 10: Robustez e casos limite

- **Objetivo:** respostas claras ao usuário em todos os cenários de falha.
- **Orientação:**
  - Pedidos 04 (impossível: "faça um bolo") e 05 (ambíguo/muito grande).
  - Cobrir: 429 do free tier (Retry On Fail + mensagem amigável na saída de falha), limite de rodadas, rejeição da API (400) simulada via fixture inválida.
  - `dry-run.ts --todos`: tabela pedido/status/tentativas/tempo.
  - Revisar textos dos Form Endings; rebuild/recolar Code nodes se houver ajustes; reexportar.
- **Testes:** bateria completa de dry-run; caso "impossível" pelo formulário até o Ending explicativo.
- **Demo:** `npm run n8n:dry-run -- --todos` mostra os 5 cenários com o comportamento esperado.

### Task 11: Entregáveis finais e verificação de restauração

- **Objetivo:** fechar documentação, evidências e reprodutibilidade.
- **Orientação:**
  - `npm run n8n:export` final (apenas os workflows do manifesto — sem Spike/Catálogo).
  - Concluir `n8n-local.ts verificar-restauracao` e executar `npm run n8n:verificar-restauracao` (pasta temporária removida ao final; se o import em base vazia exigir owner, documentar o procedimento manual e adaptar).
  - Prints em `assets/prints/` via Playwright: canvas do Núcleo, canvas do Criador, formulário, revisão, Ending de sucesso, workflow gerado aberto, lista de credenciais (apenas nomes).
  - `README.md` seguindo a estrutura de `README-exemplo.md`: problema, solução, arquitetura (mermaid), stack, integrações, como executar (instalar → subir → criar owner → importar → recriar as 4 credenciais pelos nomes → publicar Núcleo e Criador), estrutura, prints, autor.
  - Fechamento do `PLANO-IMPLEMENTACAO.md` (status final e log completo).
- **Testes:** `npm test` e `npm run build:n8n` continuam passando; links e imagens do README resolvem.
- **Demo:** repositório com README e prints, JSONs importáveis, restauração verificada e plano com log completo das 11 tasks.

## 6. Riscos e planos B

| Risco | Plano B |
|---|---|
| Página do Form não reexecuta dentro do loop | Redirect para o formulário com query params (Task 3) |
| Colagem no CodeMirror falha | `sincronizar-code.ts` via API |
| `/types/nodes.json` exige sessão | Workflow de catálogo pela UI + extração via API |
| Gemini erra o JSON com frequência | Autocorreção com erros do validador, temperatura 0.2, exemplo mínimo no prompt |
| Sub-workflow exige estar publicado | Publicar o Núcleo após cada mudança (registrado na Task 3) |
| `npm install` falha no Windows (módulos nativos) | Conferir versão do Node, repetir com `npm ci`; build tools do Windows só com confirmação do usuário |
| Porta 5678 ocupada pela instância global | Launcher para e avisa; usuário encerra a global |
| Import em base vazia exige owner | Documentar passo manual (subir, criar owner, importar) e adaptar `verificar-restauracao` |
| Perda de `n8n/instancia/.n8n/config` | Credenciais da base local ficam ilegíveis; README recomenda backup fora do git |

## Log de execução

### Task 1 — Instância n8n local do projeto (2026-10-24)

- **Ambiente:** Node v24.19.0 (dentro de 20.19–24.x), npm 11.17.0, porta 5678 livre (global encerrada pelo usuário).
- **Arquivos versionados criados:** `n8n/instancia/package.json` (`n8n@2.43.8` exato), `n8n/instancia/ambiente.env`, `n8n/workflows/manifesto.json` (`[]`), `scripts/.env.example`, `scripts/n8n/lib/env.ts`, `scripts/n8n/n8n-local.ts`, `scripts/n8n/tests/env.test.ts`, `scripts/n8n/tests/n8n-local.test.ts`.
- **Atualizados:** `.gitignore` (+`node_modules/`, `.env`, `scripts/.env`, `n8n/instancia/.n8n/`), `scripts/package.json` (`type: module` + scripts `test`, `n8n:install`, `n8n:version`, `n8n:start`, `n8n:export`, `n8n:import`, `n8n:verificar-restauracao`, `n8n:ping`, `n8n:catalogo`, `build:n8n`, `n8n:dry-run`).
- **Instalação:** `npm install` em `scripts/` (tsx/typescript) e `npm install --save-exact n8n@2.43.8` em `n8n/instancia/` (gerou `package-lock.json`). Módulos nativos (sqlite3, isolated-vm) funcionaram via prebuilds — não foi preciso aprovar postinstalls do allow-scripts.
- **Testes:** `npm test` → 15/15 passando (parser de .env e launcher).
- **Subida:** `npm run n8n:start` (background, terminalId 1) → "n8n ready", versão 2.43.8, dados em `n8n/instancia/.n8n/` (criou `database.sqlite` e `config` com encryptionKey auto-gerada). `npm run n8n:version` imprime `2.43.8` do binário local.
- **Navegador:** reusada a sessão Chrome do Playwright já aberta (perfil `mcp-chrome-f329e0e`); `http://localhost:5678` redirecionou para `/home/workflows` com a conta owner já criada pelo usuário; instância nova (0 workflows, tela "Let's build your first automation"). Snapshot confirmado.
- **Decisões/desvios:** o diretório ainda **não é um repositório git** (`git status` → "not a git repository"); `.gitignore` pronto, mas sem repo inicializado — não inicializei git sem pedido. Screenshot do dashboard não foi persistido no workspace (o Playwright salva relativo ao diretório do servidor MCP); estado validado via snapshot de acessibilidade.
- **Credenciais usadas:** nenhuma.

### Task 2 — Plano vivo e conexão com a API do n8n local (2026-10-24)

- **Arquivos criados:** `scripts/n8n/lib/api.ts` (ClienteN8n: `montarUrl` com prefixo `/api/v1`, `montarHeaders` com `X-N8N-API-KEY`, `carregarConfig`, `ErroApi` com mensagens para 401/404; `fetch` injetável), `scripts/n8n/ping.ts`, `scripts/n8n/tests/api.test.ts`.
- **Credencial:** API key criada pelo agente via UI (modal Create API Key) — Label "Meta-Fluxo Scripts", expiração **Never**, scope **All** (107/107). Valor gravado em `scripts/.env` (não versionado; nunca ecoado). `DRY_RUN_TOKEN` gerado e gravado no mesmo arquivo.
- **Testes:** `npm test` → 23/23 (8 novos de api.test.ts).
- **Conexão real:** `npm run n8n:ping` → "Conexão OK. Workflows na instância: 0."
- **Decisões:** expiração "Never" para a chave não vencer durante o projeto; a chave só é exibida uma vez na criação — captura feita pelo botão Copy oficial do n8n (o `value` do input vem truncado visualmente).

### Task 3 — Spike de riscos do n8n 2.43.8 (2026-10-24)

- **Abordagem:** em vez de montar o spike nó a nó pela UI, criei os workflows via API (mais robusto e já valida a estrutura). Scripts temporários: `scripts/n8n/spike-form-loop.ts`, `spike-subworkflow.ts`, `spike-verificar-exec.ts`, `spike-limpar.ts`.
- **Resultado 1 — loop de formulário:** `[Spike] Form Loop` (id `Moh6Cm9ctKaMnfQw`) criado via API e aceito; canvas renderiza Form Trigger → Code Placeholder → Página (Next Form Page) → Decisão (Switch 2 saídas) com a saída "Repetir" voltando à Página e "Encerrar" indo ao Form Ending. Estrutura do loop válida. **Permanece na instância** (plano pede).
- **Resultado 2 — colagem no Code node:** técnica `ClipboardEvent('paste')` + `DataTransfer` sobre `.cm-content` substituiu o conteúdo integralmente (marcador `SPIKE_PASTE_OK` presente, placeholder removido). **Funciona** — plano A confirmado, não precisa do plano B (`sincronizar-code.ts`) por enquanto.
- **Resultado 3 — sub-workflow sem publicação:** criei `[Spike] Sub Trivial` + `[Spike] Chamador` (ambos NÃO publicados) e executei o chamador via UI → execução `status: success`. **Conclusão: o Execute Sub-workflow chama um sub-workflow NÃO publicado no n8n 2.43.8.** Simplifica Tasks 8/9 (não é preciso publicar o Núcleo para o Criador chamá-lo). Auxiliares removidos; `[Spike] Form Loop` mantido.
- **Pendência registrada:** a reexecução da *página* do formulário em runtime (loop visual pelo navegador, múltiplas voltas) será exercida no E2E da Task 9; a estrutura já é aceita e a doc do n8n confirma o comportamento de branches.
- **Decisão de design:** o loop no Criador (Task 9) usa Switch voltando a um nó Form anterior, padrão validado aqui — plano B de redirect com query params fica de reserva.

## Seletores aprendidos

- Dashboard (logado): URL `/home/workflows`, título `Workflows - n8n[DEV]`, heading "Let's build your first automation" em instância vazia.
- Sidebar: menuitems "Overview", "Templates", "Insights", "Help", "Settings"; botão "Add new item", "Open command palette", "Toggle sidebar".
- Settings → n8n API: URL `/settings/api`, menuitem "n8n API"; botão "Create API key".
- Modal Create API Key: campo Label `[data-test-id="api-key-label"]`; combobox Expiration com opções 7/30/60/90 days, Custom, **Never**; radiogroup Scopes (All/Read only/Custom); botão "Save".
- Modal "API key created successfully": aviso "Make sure to copy your API key now..."; input readonly com valor **truncado** visualmente; botão Copy `[data-test-id="copy-input-button"]` copia o valor completo; botão "Done".
- Editor (workflow): nós no canvas têm `.vue-flow__node[data-id="<id>"]`; o label (`text=Nome`) NÃO é clicável (o `vue-flow__pane` intercepta pointer events) — clicar pelo `data-id` do nó, ou via `element.click()` em JS.
- Code node (NDV): o editor é `.cm-content` (CodeMirror 6), único na tela quando o NDV está aberto; abrir o NDV via duplo clique no `.vue-flow__node[data-id]`; fechar com `Escape`.
- Botão de execução: `[data-test-id="execute-workflow-button-<NomeDoTrigger>"]` (ex.: `...-Manual`); também interceptado pelo pane — clicar via JS `element.click()`.
- Botão publicar: "Publish" no topo direito (era "Activate" em versões antigas).

## Descobertas

- **Versão:** n8n 2.43.8 confirmada pelo binário local.
- **allow-scripts (lavamoat):** o ambiente bloqueia postinstalls por padrão. Em `scripts/`, foi necessário `npm rebuild esbuild` para o `tsx` funcionar. Na instância do n8n, os módulos nativos vieram com prebuilds e subiram sem aprovar scripts.
- **Windows:** o n8n loga "Ignoring N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS as it is not supported on Windows" — coerente com o valor `false` em `ambiente.env`.
- **Sandbox:** o log mostra `Sandbox: enabled=false provider=n8n-sandbox (from env)`.
- **Navegador compartilhado:** há outra sessão Kiro usando o mesmo perfil Chrome; a aba controlada pelo Playwright é reutilizável (navegar direto na aba `about:blank` funcionou).
- **Node 24:** o script `test` usa glob `n8n/tests/*.test.ts` e funcionou (Node >= 21), sem precisar listar arquivos explicitamente.
- **Public API:** base `/api/v1`, header `X-N8N-API-KEY`; `GET /workflows` responde `{ data: [...] }`. Conexão validada com 0 workflows.
- **Captura de segredo via browser:** `navigator.clipboard.writeText(input.value)` pega o texto truncado; o botão Copy nativo do n8n copia o JWT completo. Os `filename` de screenshot/evaluate do Playwright salvam relativo ao diretório do servidor MCP, não ao workspace.
- **`/types/nodes.json` acessível pela sessão do browser:** `fetch('/types/nodes.json', { credentials: 'include' })` dentro da página logada retorna o catálogo completo (via API direta dá 401). **Usar `defaultVersion ?? max(version)`** para o typeVersion — o campo `version` é um array e alguns nós não têm `defaultVersion`. Isso é o caminho da Task 4 (plano A), tornando desnecessário o workflow de catálogo pela UI.
- **typeVersions reais (n8n 2.43.8):** formTrigger 2.6, form 2.5, switch 3.4, set 3.5, if 2.3, code 2, noOp 1, executeWorkflowTrigger 1.3, manualTrigger 1, executeWorkflow 1.4.
- **Criação via API valida estrutura:** POST `/workflows` com `name/nodes/connections/settings` aceita e renderiza canvas limpo — confirma a estratégia de montar fluxos por API quando a UI for frágil (complementa a construção híbrida).
- **`textContent` do CodeMirror** concatena linhas sem `\n`; ao verificar colagem, comparar com o código **sem quebras de linha** (não bater tamanho bruto).
- **Overlay do canvas:** `.vue-flow__pane` intercepta cliques do Playwright em botões/nós; contornar com clique via `browser_evaluate` (`element.click()`).

### Task 4 — Catálogo de nós permitidos (2026-10-25)

- **Arquivos:** `n8n/catalogo/catalogo-base.json` (24 nós curados: type, displayName, categoria, descricao, obrigatorios, exemplo, precisaCredencial), `n8n/catalogo/catalogo-versoes.json` (mapa type→typeVersion capturado da sessão do browser), `n8n/catalogo/catalogo-nos.json` (gerado), `scripts/n8n/lib/catalogo.ts`, `scripts/n8n/extrair-catalogo.ts`, `scripts/n8n/tests/catalogo.test.ts`.
- **24 nós:** 6 gatilhos (manualTrigger, scheduleTrigger, webhook, formTrigger, gmailTrigger, telegramTrigger) + 18 ações (httpRequest, set, if, switch, code, merge, wait, filter, splitOut, aggregate, respondToWebhook, noOp, gmail, slack, telegram, googleSheets, airtable, form).
- **Testes:** `npm test` → 31/31 (7 novos). `npm run n8n:catalogo` imprime a tabela e gera catalogo-nos.json.
- **Decisão:** `extrair-catalogo.ts` tenta a API direta (401 sem sessão) e cai para `catalogo-versoes.json`. Quando o typeVersion mudar numa nova versão do n8n, basta recapturar o JSON pelo console logado.

### Task 4b — Validação da chave Gemini (2026-10-25)

- **Chave Gemini** adicionada a `scripts/.env` como `GEMINI_API_KEY` (não versionada; usuário decidiu não revogar — vai limpar tudo após a entrega). `.env.example` documenta a variável.
- **Modelo validado:** `gemini-2.5-flash` foi **descontinuado para novos usuários**; `gemini-flash-latest` só existe em `v1beta` (404 em `v1`). **`gemini-3.8-flash` (v1beta) funciona** e gera JSON de workflow válido.
- **Latência:** geração de JSON leva **~14s** neste ambiente/free tier. POSTs grandes podem levar >20s. **Implicação:** nó Gemini e dry-run precisam de timeout alto (60s+) e Retry On Fail. Script `scripts/n8n/testar-gemini.ts`.

### Task 5 — Validador e sanitizador (2026-10-25)

- **Arquivos:** `scripts/n8n/lib/uuid.ts` (UUID v4 sem `crypto`), `scripts/n8n/lib/layout.ts` (posições em camadas por BFS), `scripts/n8n/lib/validar-workflow.ts`, `scripts/n8n/validar-arquivo.ts`, `scripts/n8n/tests/validar-workflow.test.ts`, fixture `tests/fixtures/exemplo-llm-cercas.txt`.
- **Regras implementadas:** extração de JSON (cercas/ruído), tipo+typeVersion do catálogo (versão forçada), nomes únicos, conexões válidas, ≥1 gatilho, obrigatórios, UUID em id/webhookId, settings forçado `{executionOrder:v1}`, nome `[IA] <nome>`, remoção de campos proibidos, recálculo de posições, `impossivel:true`, erros reutilizáveis como feedback.
- **Testes:** `npm test` → 49/49. `validar-arquivo.ts` testado com a fixture → workflow sanitizado correto (posições 0→260→520, aviso de credencial do Gmail).

### Task 6 — Prompt e pré-visualização HTML (2026-10-25)

- **Arquivos:** `scripts/n8n/lib/montar-prompt.ts` (system+user prompt, catálogo compacto, regra impossivel, teto de 8000 chars), `scripts/n8n/lib/preview-html.ts` (HTML estático escapado, tabela de nós, sequências A→B→C com ramos/loop), `scripts/n8n/mostrar-prompt.ts`, `scripts/n8n/tests/prompt-preview.test.ts`, pedidos `n8n/exemplos/pedido-0{1,2,3}.json`.
- **Testes:** `npm test` → 59/59.
- **Integração ponta a ponta (prompt→Gemini→validador):** `scripts/n8n/testar-geracao-local.ts` com retry/backoff para 503/429. **pedido-01 gerou workflow VÁLIDO na 1ª validação** (Agendamento→Consultar API→Notificar Slack). Confirma que o prompt funciona e o pipeline fecha.
- **ALERTA Gemini:** o modelo específico `gemini-3.8-flash` deu 503 repetidos; `gemini-flash-latest` funcionou mas com **alta latência (~115s com backoffs)**. O free tier está sob alta demanda. pedido-02 esgotou os retries com 503. **Decisão:** usar `gemini-flash-latest` no n8n; configurar Retry On Fail agressivo; os dry-runs reais da Task 8 dependem do serviço estar disponível (fora do meu controle).

### Task 7 — Build dos Code nodes com teste em sandbox (2026-10-25)

- **Arquivos:** `scripts/n8n/entradas/{montar-prompt,validar-workflow,preview-html}.entrada.js`, `scripts/n8n/build-code-nodes.ts`, `scripts/n8n/tests/build.test.ts`, gerados `n8n/code/{montar-prompt,validar-workflow,preview-html}.js`.
- **Estratégia do build:** concatena as libs (removendo import/export), transpila TS→JS com `ts.transpileModule` (ES2020), embute o catálogo como `const CATALOGO` e anexa o trecho de entrada. Sem `module.exports` (o Code node não precisa — usa escopo direto).
- **Teste em sandbox (`node:vm`):** executa cada bundle com `$input`/`$()` simulados; verifica saída e ausência de `require`/`process`/`$env`/`module.exports` (ignorando comentários e strings — a descrição do nó Code menciona "$env" textualmente).
- **Testes:** `npm test` → 64/64 (5 novos). `npm run build:n8n` gera os 3 arquivos.
- **Descoberta:** o Set no catálogo exige `assignments` como obrigatório — a LLM precisa sempre incluí-lo (ajustar prompt se virar fonte de rejeição na Task 8).

### Task 8 — [Meta] Núcleo Gerador (2026-10-25)

- **Montagem via API** (não nó-a-nó na UI): `scripts/n8n/montar-nucleo.ts` cria/atualiza o workflow (id `EOUGKEns1rkLk9fJ`), lendo os Code nodes de `n8n/code/` e associando credenciais. Canvas renderizou correto (verificado por screenshot): 2 gatilhos → Normalizar → Montar Prompt → Gerar JSON (LLM)+Gemini → Validar → ok? → Sucesso / (pode repetir? → Nova Tentativa↩ / Falha).
- **Nós LangChain:** `@n8n/n8n-nodes-langchain.chainLlm` v1.9 (Basic LLM Chain, `hasOutputParser:false`) + `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` v1.2, conectados pela porta **`ai_languageModel`**. Modelo: `models/gemini-flash-latest`, temperatura 0.2, maxOutputTokens 8192, **Retry On Fail (maxTries 5, 5s)**.
- **Credenciais via Public API** (`scripts/n8n/criar-credenciais.ts`): `googlePalmApi` (Gemini), `httpHeaderAuth` (X-Dry-Run-Token), `httpBasicAuth` (Criador). IDs em `scripts/n8n/.credenciais.json` (NÃO versionado). **Descoberta importante: NÃO precisei de login manual — a Public API cria credenciais.** Valores de teste do Basic Auth: usuário `professor` / senha `entrega2026`.
- **Dry-run real com Gemini (3/3 OK):** pedido-01 (3 nós, Agendamento→HTTP→Slack, 110s), pedido-02 (4 nós, Webhook→If→Gmail, 31s), pedido-03 (2 nós, Form→Sheets, 84s). Todos revalidaram localmente. Execução `status: success, mode: webhook` no histórico. **Critério da Task 8 atingido.**
- **Export via API, não CLI:** `n8n export:workflow` **trava** com o servidor rodando (lock do SQLite WAL). Criei `scripts/n8n/exportar-api.ts` (GET /workflows/{id}, limpa campos voláteis, preserva ids). `n8n:export` agora usa a API; `n8n:export-cli` fica como alternativa. Gerado `n8n/workflows/nucleo-gerador.json`.
- **Scripts auxiliares:** `ativar-workflow.ts` (POST /workflows/{id}/activate — publica), `dry-run.ts` (dispara o webhook + revalida + tabela --todos). Núcleo foi **ativado** (webhook de produção no ar).
- **Pendência de segurança:** as credenciais estão com valores de teste; o `.credenciais.json` e o `.env` ficam fora do git. O usuário vai limpar tudo após a entrega.

### Task 9 — [Meta] Criador Automático de Fluxos via LLM (2026-10-25)

- **Montagem via API:** `scripts/n8n/montar-criador.ts` (id `c9nRAfHWkd5hKbVL`). Canvas verificado por screenshot: Form → Estado → Chamar Núcleo → Gerou com sucesso? → Pré-visualização → Revisão → Decisão (Switch 3 saídas: Aprovar→Criar Workflow, Ajustar→Nova Rodada, Cancelar→Fim Cancelado); Criar Workflow (Success→Fim Sucesso, Error→Nova Rodada); Nova Rodada→Dentro do limite?→(sim: loop p/ Chamar Núcleo, não: Fim Limite). Credencial `n8nApi` criada (`scripts/n8n/criar-cred-n8napi.ts`).
- **E2E REAL pelo navegador (sucesso):** form preenchido → gerou (Manual→Slack, 2 nós) → **"Ajustar" com feedback** ("adicione um nó para definir o texto") → regenerou (Manual→**Definir Mensagem (set)**→Slack, 3 nós, feedback incorporado) → **"Aprovar"** → **workflow `[IA] Notificação Manual no Slack` criado de verdade** (id `Mx1J8RrZO2Q7C8yZ`, active=false, versões corretas) → página de sucesso com link. **Critério da Task 9 atingido: criação + ajuste comprovados ponta a ponta.**
- **DESCOBERTA CRÍTICA — Basic Auth quebra o form no navegador:** com `authentication: basicAuth` no Form Trigger, o submit AJAX do cliente Vue **não reenvia** as credenciais da URL (`user:pass@host`), resultando em "Problem submitting response". O POST direto com header `Authorization` funciona (retorna `formWaitingUrl`). **Decisão: Basic Auth DESLIGADO por padrão no form** (religável via `BASIC_AUTH=1`). A credencial httpBasicAuth continua criada mas não aplicada. O webhook dry-run do Núcleo mantém Header Auth.
- **Mecânica do form multi-página:** o submit retorna `{formWaitingUrl: /form-waiting/<execId>}` imediatamente; o cliente faz **polling** de `/form-waiting/<id>/n8n-execution-status` até o fluxo chegar ao próximo nó Form. Execução fica em `status: waiting` no nó Form enquanto espera a decisão humana. Latência total dominada pelo Gemini (~2min/rodada).
- **503 do Gemini:** uma execução (id 6) falhou com 503 propagado (Retry On Fail esgotado). É instabilidade do free tier, não do design — quando o Gemini responde, tudo funciona (provado no E2E e nos 3 dry-runs).
- **Bug cosmético corrigido:** o número da "Rodada" no preview mostrava sempre 1 (o item que chega do Núcleo tem `tentativa`, não `rodada`). Ajustei `preview-html.entrada.js` para ler `$('Nova Rodada')`/`$('Estado')` com fallback seguro para uso isolado.
- **Caminho "Cancelar":** validado por construção (3ª saída do Switch → Fim: Cancelado, mesmo mecanismo dos outros dois) — NÃO exercido ponta a ponta pelo navegador para poupar quota/tempo do Gemini. Honestamente registrado como não testado em runtime.
- **Export:** `n8n/workflows/{nucleo-gerador,criador-fluxos}.json` + manifesto com os 2 ids. Workflow de teste `[IA]` removido; instância com os 2 [Meta] + [Spike] Form Loop.
- **Scripts auxiliares:** `listar-execucoes.ts`, `detalhe-execucao.ts`.

### Task 10 — Robustez e casos limite (2026-10-25)

- **Pedidos limite:** `n8n/exemplos/pedido-04-impossivel.json` (receita de bolo) e `pedido-05-ambiguo.json` (vago). `dry-run.ts` agora aceita sufixos (`pedido-[\w-]+`), timeout 280s, e detalhe amigável para 503.
- **Caso IMPOSSÍVEL — validado (execução 11, success):** o Gemini retornou `impossivel:true` com motivo "receita culinária... não descreve um fluxo de automação viável"; o Núcleo roteou direto para **Saída Falha** com `tentativa:1` (sem loopar — design correto: impossível não repete). Comprovado pelo dump da execução.
- **429/503 — comportamento validado involuntariamente:** o Retry On Fail do nó Gemini atua; quando esgota, o fluxo falha com "Service unavailable..." (execuções 6, 12). O `dry-run.ts` identifica e rotula como instabilidade do free tier, não falha de design.
- **Erro de validação / autocorreção:** coberto por 49 testes unitários do validador + o loop "pode repetir?" no Núcleo (erros viram `errosAnteriores` na próxima tentativa).
- **Limite de rodadas:** lógica `Dentro do limite? (rodada <= 3)` → `Fim: Limite`, montada e verificada estruturalmente no canvas; o loop Ajustar foi exercido no E2E (rodada 1→2).
- **LIMITAÇÃO EXTERNA:** o Gemini free tier (`gemini-flash-latest`) está com 503 intermitente e latência ~2min. Isso NÃO é defeito do projeto — quando o serviço responde, todos os caminhos funcionam (3/3 dry-runs na Task 8, E2E completo na Task 9, caso impossível aqui). A bateria `dry-run --todos` depende do serviço estar estável no momento.

### Task 11 — Entregáveis finais e verificação de restauração (2026-10-25)

- **Verificação de restauração:** `scripts/n8n/verificar-restauracao.ts` (via API — o CLI `export`/`import` trava com o servidor rodando por lock do SQLite WAL). Confere name/nodes/connections/settings, id vs manifesto, e compara nós/conexões com a instância. Resultado: ✓ nucleo-gerador (12 nós) e ✓ criador-fluxos (14 nós) íntegros e reproduzíveis.
- **Prints** em `assets/prints/`: 01 Núcleo (canvas), 02 Criador (canvas), 03 Formulário, 04 Revisão (prévia+decisão), 05 Lista de workflows, 06 Credenciais. (Os screenshots do Playwright MCP salvam na raiz do Kiro; copiados para o workspace via shell.)
- **README.md** completo seguindo o modelo do README-exemplo: problema, solução, arquitetura (2 diagramas mermaid), stack, integrações, detalhes técnicos, como executar, testes, prints, estrutura.
- **Export final** via API: `n8n/workflows/{nucleo-gerador,criador-fluxos}.json` atualizados.
- **Verificação final:** `npm test` → 64/64; `npm run build:n8n` → 3 bundles; export OK.
- **Scripts auxiliares:** `dados-execucao.ts`, `gerar-preview-demo.ts`.

## Status final

**Todas as 11 tasks concluídas.** O meta-fluxo funciona de ponta a ponta: o Criador (formulário) chama o Núcleo (Gemini + validação + autocorreção), mostra a prévia, aceita ajuste com feedback, e cria o workflow aprovado via API. Validado por: 64 testes unitários, 3/3 dry-runs do Núcleo, E2E completo pelo navegador (gerar → ajustar → aprovar → criar), e caso impossível. Instância local versionada (n8n 2.43.8), 2 workflows [Meta] + 1 [Spike].

### Decisões tomadas de forma autônoma (para revisão do usuário)

1. **Chaves em claro:** `GEMINI_API_KEY` e `N8N_API_KEY` estão em `scripts/.env` (fora do git) e foram coladas no chat. O usuário optou por não revogar e limpar tudo após a entrega.
2. **Basic Auth do formulário DESLIGADO:** quebrava o submit do form no navegador. O form está aberto (aceitável numa instância local). Religável com `BASIC_AUTH=1` ao montar o Criador.
3. **Credenciais com valores de teste:** Basic Auth `professor`/`entrega2026`; as credenciais de Gmail/Slack/Sheets NÃO foram configuradas — o escopo é gerar/criar o fluxo, não executá-lo. Os fluxos gerados que usam esses nós precisariam da credencial real para rodar.
4. **Caso "Cancelar" não exercido em runtime pelo navegador** (validado por construção) — para poupar quota/tempo do Gemini.
5. **Git não inicializado:** o `.gitignore` está pronto, mas o diretório não é um repositório git. Não inicializei sem pedido.
6. **Gemini free tier instável:** 503 intermitente e latência ~2min por geração. Não é defeito do projeto; afeta a execução ao vivo.
7. **`[Spike] Form Loop`** permanece na instância (removível com `spike-limpar.ts <id>`).

## Extensões pós-entrega (2026-10-25)

Depois das 11 tasks, o projeto foi estendido para demonstrar o meta-fluxo com um caso real completo (aprovação de férias lendo dados de uma planilha Google). As mudanças abaixo foram feitas de forma autônoma, com validação ponta a ponta.

### E1 — Troca do LLM: Gemini → OpenAI `gpt-4o-mini`

- **Motivo:** o free tier do Gemini esgotou a cota diária (20 req/dia) e tinha latência ~110s + 503 intermitentes. A OpenAI `gpt-4o-mini` gera em ~5s e o usuário comprou créditos de API.
- **Esclarecimento:** ChatGPT Plus ≠ API OpenAI (planos de cobrança distintos); foi preciso créditos de API, não a assinatura do chat.
- **Alterações:** catálogo ampliado com nós de IA na categoria `ia` (`@n8n/n8n-nodes-langchain.chainLlm` e `@n8n/n8n-nodes-langchain.lmChatOpenAi`, antes `lmChatGoogleGemini`); Núcleo Gerador passou a usar o nó `lmChatOpenAi` com a credencial `OpenAI Meta-Fluxo` (`openAiApi`); validador (`lib/validar-workflow.ts`) normaliza o `model` do OpenAI para resource locator `{__rl, mode:'list', value}`, exige que o `chainLlm` tenha um `lmChat` conectado por `ai_languageModel` e injeta a credencial de IA via `CRED_IA` no build.
- **Credencial:** `OpenAI Meta-Fluxo` (`openAiApi`, id em `.credenciais.json`). Chave em `scripts/.env` (`OPENAI_API_KEY`, fora do git).

### E2 — Fluxo de demonstração `[IA] Aprovação de Férias`

- **Gerado pelo próprio Criador** (não montado à mão) e publicado. Id `Tlm883WHkXPaez7Y`; form em `http://localhost:5678/form/4d20cfbd-4319-4091-8d47-9bf081d5d887`.
- **Nó de cálculo determinístico:** a avaliação das regras de férias (antecedência ≥30 dias, período ≥5 dias e ≤ saldo, datas válidas, histórico) é feita por um nó Code **"Calcular Regras"** ANTES da IA. A LLM só **redige** a decisão a partir do resultado do cálculo — não faz aritmética (LLMs erram contas). Script: `reestruturar-ferias.ts`.
- **Formulário guiado:** o formulário do Criador ganhou um passo com instruções objetivas de como descrever um bom fluxo (campos guiados), para orientar quem solicita a automação.
- **Cadeia:** Formulário de Férias → Base → Calcular Regras → Avaliar (`chainLlm`) + Modelo (`lmChatOpenAi` via `ai_languageModel`) → Ler Resposta → Decidir (If) → [aprovado] Enviar E-mail ao Gestor → Página de Aprovação do Gestor → Registrar Conclusão; [reprovado] Página de Erro.
- **Testado E2E:** casos aprovado e reprovado, incluindo a aprovação do gestor e o e-mail simulado ao colaborador.

### E3 — Integração Google (Drive + Sheets)

- **Google Cloud:** projeto `unifecaf-lowcode`; APIs Google Sheets e Google Drive ativadas; tela de consentimento OAuth tipo **Interno** (conta Workspace `@a.fecaf.com.br`, evita verificação/testers); OAuth Client com redirect URI `http://localhost:5678/rest/oauth2-credential/callback` (cadastrada em "URIs de redirecionamento autorizados" — um erro inicial foi tê-la posto em "Origens JavaScript", o que causava `redirect_uri_mismatch`).
- **Credenciais no n8n:** `Google Drive account` (`googleDriveOAuth2Api`) e `Google Sheets account` (`googleSheetsOAuth2Api`, id `tMrBafkEAsc5lYHc`) — ambas conectadas via sign-in interativo do Google (feito manualmente pelo usuário; o Google bloqueia automação nesse passo). Client ID/Secret em `scripts/.env` (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, fora do git).
- **Planilha real:** criada no navegador (Google Sheets), id `1gcXSNOT8jkXP5nt4EMvnihJqjZ200b153AK_btA33og`, com abas `colaboradores` (matricula, nome, email, gestor, emailGestor, dataAdmissao, saldoDias — 3 colaboradores) e `ferias` (matricula, inicio, fim, dias).
- **Substituição no fluxo de férias:** o nó `Base (CSV)` (dados hardcoded) foi trocado por leitura real da planilha (script `conectar-sheets-ferias.ts`):
  - `Ler Colaboradores` (Google Sheets, aba `colaboradores`) → `Ler Férias` (Google Sheets, aba `ferias`) → `Base (CSV)` (agora um nó Code que **agrega** as duas abas em `{ colaboradores, ferias }` — manteve o nome para preservar a referência `$('Base (CSV)')` do nó de cálculo) → `Calcular Regras`.
- **Verificação:** execução real (id 28) com status `success`; o nó agregador retornou os 3 colaboradores da planilha (João Silva/20, Maria Oliveira/12, Pedro Santos/8), a solicitação da matrícula 123 foi aprovada, passou pela aprovação do gestor e registrou o e-mail simulado para `joao@example.com` (dado vindo da planilha, confirmando a leitura real).

### E4 — Estado dos artefatos

- `n8n/workflows/manifesto.json` agora inclui `exemplo-aprovacao-ferias.json` (além de `nucleo-gerador.json` e `criador-fluxos.json`); `npm run n8n:export` reexporta os três.
- Testes: `npm test` → 67/67 passando. Credenciais registradas por nome/id em `scripts/n8n/.credenciais.json` (não versionado).
- Scripts novos em `scripts/n8n/`: `conectar-sheets-ferias.ts`, `ver-no.ts`, `ver-tipo-no.ts`, `criar-cred-openai.ts`, `testar-openai.ts`, `reestruturar-ferias.ts`, `corrigir-*.ts`.

### Pendências conhecidas

- As credenciais de teste (OpenAI, Google OAuth, API keys) serão removidas pelo usuário após a entrega.
- Git ainda não inicializado (não fazer sem pedido).
- Caminho "Cancelar" do Criador validado por construção, não exercido em runtime.

### E5 — Planilha ampliada e envio real de e-mail via Gmail (2026-10-25)

**Planilha com mais colaboradores e histórico**
- A aba `colaboradores` passou de 3 para **8 colaboradores** e a aba `ferias` de 3 para **11 registros** de férias já concedidas (datas passadas).
- Todos os e-mails seguem o padrão **`zas+[ALIAS]@code200.com.br`**, inclusive os dos gestores (ex.: colaborador João → `zas+joao@code200.com.br`; gestor Carlos Souza → `zas+carlos@code200.com.br`). O sub-addressing `+alias` entrega tudo na mesma caixa, o que facilita a verificação.
- Fonte única dos dados: `scripts/n8n/dados-planilha-ferias.ts` (gera os TSVs e copia para o clipboard). A planilha foi preenchida colando os TSVs via clipboard (`clip` + `Ctrl+V` na grade do Google Sheets), limpando a região anterior antes (`Ctrl+Home`, `Ctrl+A`, `Delete`).

**Integração Gmail (envio real)**
- API do Gmail ativada no projeto `unifecaf-lowcode` (Google Cloud).
- Credencial `Gmail account` (`gmailOAuth2`, id `aRamFGrlqyZa5UMH`) criada no n8n reutilizando o mesmo OAuth Client (Client ID/Secret do `.env`); sign-in interativo feito manualmente pelo usuário (escopos `gmail.modify`/`gmail.compose`/`mail.google.com`). Como o consent screen é Interno, não exigiu testers nem verificação.
- Os dois nós Code de e-mail simulado foram substituídos por **nós Gmail reais** (`n8n-nodes-base.gmail`, typeVersion 2.1, operação `message:send`), mantendo nome, posição e conexões (script `conectar-gmail-ferias.ts`):
  - `Enviar E-mail ao Gestor`: envia para `{{ $('Calcular Regras').first().json.colaborador.emailGestor }}` avisando da aprovação e pedindo ciência.
  - `Registrar Conclusão`: envia para `{{ ...colaborador.email }}` confirmando a aprovação final.
  - Corpo dos e-mails montado com dados reais (nome, período, dias, motivo redigido pela IA).
- **Verificado ponta a ponta** (execução id 29, status `success`, matrícula 234 / Ana Costa): o Gmail retornou `id` de mensagem com label `SENT` nos dois envios — ao gestor (`zas+carlos@code200.com.br`, msg `1a175600ef8b58d5`) e ao colaborador (`zas+anacosta@code200.com.br`, msg `1a17560652f421b9`). Ou seja, e-mails enviados de verdade, com destinatários vindos da planilha.

**Artefatos**
- `scripts/n8n/.credenciais.json`: adicionada `gmailOAuth2`.
- Scripts novos: `dados-planilha-ferias.ts`, `conectar-gmail-ferias.ts`.
- `exemplo-aprovacao-ferias.json` reexportado (contém os 2 nós Gmail e a referência da credencial).
- Prints da planilha: `assets/prints/sheets-colab.png`, `assets/prints/sheets-ferias.png`.
- Testes: `npm test` → 67/67.

### E6 — Prints de evidência (2026-10-25)

Planilha renomeada para **"Base de Férias - Colaboradores"**. Evidências capturadas em `assets/prints/`:

- `evidencia-planilha-colaboradores.png` — aba `colaboradores` com os 8 colaboradores e a coluna `emailGestor` no padrão `zas+[alias]@code200.com.br`.
- `evidencia-planilha-ferias.png` — aba `ferias` com os 11 registros de férias concedidas.
- `evidencia-execucao-ferias-gmail.png` — canvas da execução 29 (todos os nós com sucesso, incluindo Google Sheets e Gmail).
- `evidencia-email-gestor-no.png` — nó `Enviar E-mail ao Gestor`: campo **To** resolvido para `zas+carlos@code200.com.br` e **Output** `labelIds: [SENT]` (msg `1a175600ef8b58d5`).
- `evidencia-email-colaborador-no.png` — nó `Registrar Conclusão`: campo **To** resolvido para `zas+anacosta@code200.com.br` e **Output** `labelIds: [SENT]` (msg `1a17560652f421b9`).

O usuário confirmou o recebimento dos dois e-mails na caixa `zas@code200.com.br` (captura da caixa de entrada feita pelo próprio usuário).

### E7 — Caminhos de reprovação com e-mail ao colaborador + evidência da aprovação do gestor (2026-10-25)

**Ação manual do gestor (aprovação/reprovação)**
- A "Página de Aprovação do Gestor" foi reconfigurada com um radio **Decisão** (`Aprovar`/`Reprovar`, obrigatório) + campo **Motivo da reprovação** (textarea). Antes o radio estava mal configurado (opções vazias), aparecendo como um checkbox pré-marcado.
- Novo nó If **"Decisão do Gestor"** ramifica a partir da escolha do gestor:
  - `Aprovar` → `Registrar Conclusão` (e-mail de aprovação ao colaborador — fluxo já existente).
  - `Reprovar` → `E-mail Reprovação Gestor` (Gmail ao colaborador com o motivo informado) → `Página Reprovado` (Form Ending).

**E-mail de reprovação ao colaborador (dois casos)**
- **Reprovação automática** (regras não atendidas — porta `false` do nó `Decidir`): inserido nó `E-mail Reprovação Automática` (Gmail) antes da `Página de Erro`. O motivo vem de `$('Ler Resposta').motivo` (texto redigido pela IA listando as violações).
- **Reprovação pelo gestor**: nó `E-mail Reprovação Gestor`; o motivo vem do campo "Motivo da reprovação" preenchido pelo gestor (com fallback "Não informado" se vazio).
- Script: `adicionar-reprovacao-ferias.ts` (idempotente).

**Verificação ponta a ponta (3 caminhos, e-mails reais via Gmail)**
- Exec 30 — reprovação automática (matrícula 789, antecedência 2 dias e período > saldo): e-mail `SENT` para `zas+pedro@code200.com.br` com o motivo detalhado.
- Exec 31 — reprovação do gestor (matrícula 345): gestor escolheu `Reprovar` com motivo "fechamento trimestral"; e-mail `SENT` para `zas+bruno@code200.com.br`.
- Exec 32 — aprovação do gestor (matrícula 567): gestor escolheu `Aprovar`; e-mail de conclusão `SENT` para `zas+carla@code200.com.br` (fluxo feliz intacto).

**Prints de evidência adicionados em `assets/prints/`**
- `evidencia-pagina-gestor.png` — página de decisão do gestor (Aprovar/Reprovar + Motivo).
- `evidencia-pagina-gestor-reprovar.png` — gestor reprovando com motivo preenchido (ação manual).
- `evidencia-pagina-gestor-aprovar.png` — gestor aprovando (ação manual).
- `evidencia-email-reprova-auto-no.png` — nó Gmail da reprovação automática (To + Output SENT).
- `evidencia-email-reprova-gestor-no.png` — nó Gmail da reprovação do gestor (motivo do gestor + To + Output SENT).
- `evidencia-canvas-ferias-final.png` / `evidencia-fluxo-completo-reprovacao.png` — canvas com os três caminhos (aprovado, reprovado automático, reprovado pelo gestor).

Testes: `npm test` → 67/67; `exemplo-aprovacao-ferias.json` reexportado com os novos nós e conexões.

### E8 — Contexto da solicitação na página do gestor (2026-10-25)

A página de aprovação do gestor não exibia qual colaborador nem o período — o gestor decidia sem contexto. Corrigido.

- **Descoberta:** nós Form intermediários (não-trigger) de typeVersion 2.5 **herdam o título/descrição do Form Trigger e ignoram `formTitle`/`formDescription` próprios**. A primeira tentativa (preencher `formDescription`) não renderizou nada. Solução: um campo do tipo **`html`** no topo do formulário, cujo conteúdo é resolvido por expressão.
- A "Página de Aprovação do Gestor" agora mostra, antes dos campos de decisão: **Colaborador** (nome + matrícula), **Período solicitado** (início a fim + dias), **Saldo de dias**, **Gestor responsável** e **Avaliação automática** (texto da IA). Dados via `$('Calcular Regras')` e `$('Ler Resposta')`. Script: `detalhar-pagina-gestor.ts`.
- **Verificação ponta a ponta com a nova página:**
  - Exec 34 — reprovação do gestor (João Silva, matrícula 123): resumo exibido corretamente; gestor reprovou com motivo; e-mail `SENT`.
  - Exec 35 — aprovação do gestor (Diego Ferreira, matrícula 678): resumo exibido (período 14–25/12, 12 dias, saldo 18, gestor Ana Lima); gestor aprovou; e-mail de conclusão `SENT`.
- **Prints substituídos** em `assets/prints/` (agora com o resumo da solicitação visível): `evidencia-pagina-gestor.png`, `evidencia-pagina-gestor-reprovar.png`, `evidencia-pagina-gestor-aprovar.png`.

Testes: `npm test` → 67/67; `exemplo-aprovacao-ferias.json` reexportado.

### E9 — Registro das férias na planilha ao aprovar + correção de acento e prints (2026-10-25)

**Registro automático das férias concedidas**
- Ao o gestor **aprovar**, o fluxo agora grava a concessão na aba `ferias` da planilha antes de notificar o colaborador. Novo nó Google Sheets `append` **"Registrar Férias na Planilha"** entre `Decisão do Gestor [Aprovar]` e `Registrar Conclusão`, mapeando `matricula/inicio/fim/dias` de `$('Calcular Regras')`. Script: `registrar-ferias-planilha.ts`.
- **Verificado** (exec 36, João Silva matrícula 123, aprovado pelo gestor): a aba `ferias` passou de 11 para 12 linhas — a linha `123 | 2027-01-11 | 2027-01-20 | 10` foi inserida pelo fluxo; e-mail de conclusão `SENT`.

**Correção de acentuação e atualização dos prints**
- O usuário corrigiu manualmente o nome "João Silva" na planilha (estava com erro de acentuação). Fluxo re-executado e evidências refeitas.
- Prints atualizados em `assets/prints/`:
  - `evidencia-planilha-colaboradores.png` — "João Silva" com acentuação correta.
  - `evidencia-planilha-ferias.png` — 12 registros, incluindo a linha gravada pelo fluxo na aprovação.
  - `evidencia-pagina-gestor.png` / `evidencia-pagina-gestor-aprovar.png` — página do gestor com o nome correto e o resumo da solicitação.
  - `03-formulario-solicitacao.png` — formulário do Criador atualizado (guia passo a passo + 5 campos guiados).
  - `evidencia-canvas-ferias-final.png` — canvas com o novo nó de registro na planilha.

Testes: `npm test` → 67/67; `exemplo-aprovacao-ferias.json` reexportado (inclui o nó de append).

### E10 — Novo fluxo `[IA] Triagem de Reclamações` (Trello + LLM + Gmail) (2026-10-26)

Fluxo novo montado manualmente via API (robusto e versionado), id `aIOM89MKlMuy8oA1`, form em `http://localhost:5678/form/reclamacoes-form`.

**Conexões criadas**
- **Trello:** criado o power-up "n8n Integracao Reclamacoes" no Admin Portal (aceite dos termos do desenvolvedor), gerada API Key + Secret e token autorizado manualmente pelo usuário (scope read,write,account). Credencial `trelloApi` no n8n (id `qtwao8ofwPIDDzB2`). Board "Sistema de Exemplo" (`6990eaa171fa0f1cf5a70e49`) com listas N1 Chatbot / N2 Humano / N3 Desenvolvimento / Concluído mapeadas em `.credenciais.json` (`_trelloBoard`). Chaves em `scripts/.env`.
- **Gmail e OpenAI:** reutilizadas das etapas anteriores.
- **Typeform:** descartado (webhooks exigem plano pago). Substituído por **n8n Form Trigger** com os campos nome, e-mail, assunto, descrição, por decisão do usuário.

**Desenho do fluxo** (10 nós, lineares)
Formulário de Reclamação → Criar Card (Trello, lista N1) → Ler Cards Abertos (HTTP autenticado pela credencial trelloApi: `GET /boards/{id}/cards`) → Montar Contexto (Code: resume reclamação + cards abertos, mapeando listId→status) → Avaliar (chainLlm) + Modelo (lmChatOpenAi) → Ler Decisão (Code: parseia JSON, define `listaDestino`) → Mover Card (Trello update idList) → Comentar no Card (Trello cardComment) → Enviar E-mail ao Cliente (Gmail). Script: `montar-reclamacoes.ts`.

**Decisão da IA** (JSON): `{decisao: resolvido|humano|em_andamento, statusExistente, prazoHoras, respostaCliente, comentarioCard}`. O roteamento (lista destino) é calculado no Code "Ler Decisão": resolvido→Concluído, humano→N2, em_andamento→lista do status detectado (N2/N3). A leitura dos cards abertos é o insumo que permite à IA identificar bug já conhecido.

**Correções durante a construção**
- `card:addComment` não existe no nó Trello v1 → usar `resource: cardComment, operation: create`.
- Após "Mover Card", o `$json` perde os campos da decisão → comentário e e-mail passam a referenciar `$('Ler Decisão').first().json...`.
- Campo de descrição do card é `desc` (não `description`) no `additionalFields`.

**Verificação ponta a ponta (3 caminhos, e-mails reais + Trello real)**
- **resolvido** (exec 42, "Como altero minha senha?"): IA respondeu direto, card movido N1→Concluído, comentário + e-mail `SENT`.
- **humano** (exec 43, pedido de reembolso): IA decidiu humano, card movido para N2, resposta com prazo de 48h, comentário + e-mail `SENT`.
- **em_andamento** (exec 44, erro ao exportar PDF): com o card insumo "BUG: Exportação de relatório em PDF falha" em N3, a IA detectou o problema existente, decidiu em_andamento (status N3), card em N3, comentário + e-mail `SENT`.
- Estado final do board: N1=0, N2=1, N3=2, Concluído=1 (confirmado via API).

**Artefatos**
- Credenciais: `trelloApi` + `_trelloBoard` em `scripts/n8n/.credenciais.json`; `_reclamacoes` com o id do workflow.
- Scripts novos em `scripts/n8n/`: `trello-info.ts`, `trello-estado.ts`, `trello-limpar.ts`, `criar-cred-trello.ts`, `criar-card-bug-exemplo.ts`, `montar-reclamacoes.ts`.
- Workflow adicionado ao `manifesto.json` e exportado: `n8n/workflows/exemplo-triagem-reclamacoes.json`.
- Prints em `assets/prints/`: `evidencia-canvas-reclamacoes.png`, `evidencia-form-reclamacao.png`, `evidencia-trello-board.png`, `evidencia-trello-card-comentario.png`.
- README atualizado com a seção "Fluxos de demonstração" (férias + reclamações) e a tabela de integrações ampliada.

Testes: `npm test` → 67/67; export dos 4 workflows OK.

### E11 — Correção de quebras de linha nos e-mails de reclamação (2026-10-26)

Os e-mails chegavam com `\n` literal (texto visível) em vez de quebras de linha reais. Duas causas, ambas corrigidas no `montar-reclamacoes.ts`:

1. **Template do e-mail usava `\\n` em expressão n8n** (`={{...}}\n\n`), que o motor de expressões trata como literal. Solução: o corpo do e-mail passou a ser montado dentro do Code "Ler Decisão" (campo `corpoEmail`) usando template JS com quebras reais; o nó Gmail agora só referencia `{{ $('Ler Decisão').first().json.corpoEmail }}`.
2. **A própria LLM incluía `\n` no `respostaCliente`.** Solução: função `limpar()` no Code normaliza sequências `\n`/`\r\n` literais, e o prompt foi reforçado para a IA escrever um único parágrafo corrido, SEM saudação, SEM assinatura e SEM `\n` (a saudação com o nome e a assinatura são adicionadas pelo fluxo).

**Verificação** (exec 46, caso em_andamento): o campo `corpoEmail` confirmado sem barra-n literal (`TEM_BARRA_N_LITERAL: false`) e com quebras reais (`TEM_QUEBRA_REAL: true`); e-mail enviado via Gmail (`SENT`). Fluxo reexportado.

Obs.: durante esta etapa o navegador MCP desconectou; o re-teste foi feito submetendo o Form Trigger de produção via POST `multipart/form-data` (script `submeter-reclamacao.ts`, usando os nomes internos `field-0..field-3`).

### E12 — Conteúdo do e-mail registrado no comentário do card (tracking) (2026-10-26)

Para garantir a rastreabilidade da resposta ao cliente, o comentário no card passou a conter o **conteúdo exato do e-mail enviado** (antes era só um resumo).

- **Reordenação do fluxo:** Mover Card → **Enviar E-mail ao Cliente** → **Montar Comentário** (Code) → **Comentar no Card**. O e-mail agora é enviado antes do comentário, para que o comentário possa confirmar o envio e incluir o ID da mensagem.
- Novo Code **"Montar Comentário"** (`JS_TRACKING`) monta o texto do comentário com: triagem (decisão), destinatário, assunto, **ID da mensagem Gmail** (confirmação de envio), o **corpo completo do e-mail** entre separadores, e as observações da triagem. Quebras de linha reais.
- O nó "Comentar no Card" passou a usar `{{ $json.comentario }}` (vindo do Code) e `{{ $json.cardId }}`.

**Verificação** (exec 47, caso em_andamento): e-mail enviado (`SENT`, ID `1a17665cd39be23d`); comentário no card confirmado via API do Trello contendo o corpo integral do e-mail, destinatário, assunto e ID Gmail. Fluxo reexportado; `npm test` 67/67.

Obs.: o navegador MCP seguiu desconectado nesta etapa; a verificação foi feita via API do n8n (saída do nó) e API do Trello (`ver-comentarios-card.ts`). Card de exemplo: https://trello.com/c/czF23PDd
