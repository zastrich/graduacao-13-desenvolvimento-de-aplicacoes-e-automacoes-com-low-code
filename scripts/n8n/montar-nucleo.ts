/**
 * Task 8 — monta/atualiza o workflow [Meta] Núcleo Gerador via API.
 *
 * Estrutura:
 *   Execute Sub-workflow Trigger ─┐
 *   Webhook POST dry-run ─────────┴─> Normalizar Entrada (Set)
 *     -> Montar Prompt (Code) -> Basic LLM Chain (+ Gemini Chat Model)
 *     -> Validar e Sanitizar (Code) -> If "ok?"
 *          ok=true  -> Saída Sucesso (Set)
 *          ok=false -> If "pode repetir?" (tentativa < 3 e não impossível)
 *                         true  -> Nova Tentativa (Set) -> volta a Montar Prompt
 *                         false -> Saída Falha (Set)
 *
 * Reexecuta: se já existir um workflow com esse nome, atualiza (mantém o ID).
 * Registra o ID em n8n/workflows/manifesto.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..', '..');
const CODE_DIR = path.join(RAIZ, 'n8n', 'code');
const MANIFESTO = path.join(RAIZ, 'n8n', 'workflows', 'manifesto.json');

const NOME = '[Meta] Núcleo Gerador';
const MAPA_CREDS = path.join(__dirname, '.credenciais.json');

interface RefCred { id: string; name: string; }
function creds(): Record<string, RefCred | null> {
  if (!fs.existsSync(MAPA_CREDS)) {
    console.warn('Aviso: .credenciais.json não encontrado — nós ficarão sem credencial. Rode criar-credenciais.ts.');
    return {};
  }
  return JSON.parse(fs.readFileSync(MAPA_CREDS, 'utf8'));
}

const V = {
  executeWorkflowTrigger: 1.3,
  webhook: 2.2,
  set: 3.5,
  code: 2,
  if: 2.3,
  chainLlm: 1.9,
  openai: 1.3,
};

function code(nome: string): string {
  return fs.readFileSync(path.join(CODE_DIR, nome), 'utf8');
}

function pos(x: number, y: number): [number, number] {
  return [x, y];
}

// Condição If: "ok?" -> $json.ok === true
function condOk() {
  return {
    options: { caseSensitive: true, typeValidation: 'loose', version: 2 },
    conditions: [
      {
        id: 'c-ok',
        leftValue: '={{ $json.ok }}',
        rightValue: true,
        operator: { type: 'boolean', operation: 'true', singleValue: true },
      },
    ],
    combinator: 'and',
  };
}

// Condição If: "pode repetir?" -> tentativa < 3 E impossivel != true
function condRepetir() {
  return {
    options: { caseSensitive: true, typeValidation: 'loose', version: 2 },
    conditions: [
      {
        id: 'c-tent',
        leftValue: '={{ $json.tentativa }}',
        rightValue: 3,
        operator: { type: 'number', operation: 'lt' },
      },
      {
        id: 'c-imp',
        leftValue: '={{ $json.impossivel === true }}',
        rightValue: false,
        operator: { type: 'boolean', operation: 'false', singleValue: true },
      },
    ],
    combinator: 'and',
  };
}

function setAssign(id: string, nome: string, valor: string, tipo = 'string') {
  return { id, name: nome, value: valor, type: tipo };
}

function build() {
  const cr = creds();
  const credOpenAi = cr.openAiApi
    ? { openAiApi: { id: cr.openAiApi.id, name: cr.openAiApi.name } }
    : undefined;
  const credHeader = cr.httpHeaderAuth
    ? { httpHeaderAuth: { id: cr.httpHeaderAuth.id, name: cr.httpHeaderAuth.name } }
    : undefined;

  const nodes = [
    {
      parameters: {
        workflowInputs: {
          values: [
            { name: 'nomeFluxo', type: 'string' },
            { name: 'gatilho', type: 'string' },
            { name: 'acoes', type: 'string' },
            { name: 'detalhes', type: 'string' },
            { name: 'feedback', type: 'string' },
            { name: 'errosAnteriores', type: 'array' },
          ],
        },
      },
      id: 'n-sub-trigger',
      name: 'When Executed by Another Workflow',
      type: 'n8n-nodes-base.executeWorkflowTrigger',
      typeVersion: V.executeWorkflowTrigger,
      position: pos(-400, 100),
    },
    {
      parameters: {
        httpMethod: 'POST',
        path: 'meta-gerador-dry-run',
        responseMode: 'lastNode',
        authentication: 'headerAuth',
        options: {},
      },
      id: 'n-webhook',
      name: 'Webhook Dry-Run',
      type: 'n8n-nodes-base.webhook',
      typeVersion: V.webhook,
      position: pos(-400, 320),
      webhookId: 'meta-gerador-dry-run',
      ...(credHeader ? { credentials: credHeader } : {}),
    },
    {
      parameters: {
        assignments: {
          assignments: [
            setAssign('a-nome', 'nomeFluxo', '={{ $json.body?.nomeFluxo ?? $json.nomeFluxo }}'),
            setAssign('a-gat', 'gatilho', '={{ $json.body?.gatilho ?? $json.gatilho }}'),
            setAssign('a-aco', 'acoes', '={{ $json.body?.acoes ?? $json.acoes }}'),
            setAssign('a-det', 'detalhes', '={{ $json.body?.detalhes ?? $json.detalhes ?? "" }}'),
            setAssign('a-fb', 'feedback', '={{ $json.body?.feedback ?? $json.feedback ?? "" }}'),
            setAssign('a-err', 'errosAnteriores', '={{ $json.body?.errosAnteriores ?? $json.errosAnteriores ?? [] }}', 'array'),
            setAssign('a-tent', 'tentativa', '={{ $json.body?.tentativa ?? $json.tentativa ?? 1 }}', 'number'),
          ],
        },
        options: {},
      },
      id: 'n-normalizar',
      name: 'Normalizar Entrada',
      type: 'n8n-nodes-base.set',
      typeVersion: V.set,
      position: pos(-140, 200),
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: code('montar-prompt.js') },
      id: 'n-montar',
      name: 'Montar Prompt',
      type: 'n8n-nodes-base.code',
      typeVersion: V.code,
      position: pos(120, 200),
    },
    {
      parameters: {
        promptType: 'define',
        text: '={{ $json.userPrompt }}',
        messages: {
          messageValues: [{ message: '={{ $json.systemPrompt }}' }],
        },
        hasOutputParser: false,
      },
      id: 'n-chain',
      name: 'Gerar JSON (LLM)',
      type: '@n8n/n8n-nodes-langchain.chainLlm',
      typeVersion: V.chainLlm,
      position: pos(380, 200),
      retryOnFail: true,
      maxTries: 5,
      waitBetweenTries: 5000,
      // timeout generoso por tentativa (o Gemini free tier é lento/instável)
    },
    {
      parameters: {
        model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
        options: { temperature: 0.2 },
      },
      id: 'n-openai',
      name: 'OpenAI Chat Model',
      type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
      typeVersion: V.openai,
      position: pos(380, 420),
      ...(credOpenAi ? { credentials: credOpenAi } : {}),
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: code('validar-workflow.js') },
      id: 'n-validar',
      name: 'Validar e Sanitizar',
      type: 'n8n-nodes-base.code',
      typeVersion: V.code,
      position: pos(640, 200),
    },
    {
      parameters: { conditions: condOk(), options: {} },
      id: 'n-if-ok',
      name: 'ok?',
      type: 'n8n-nodes-base.if',
      typeVersion: V.if,
      position: pos(900, 200),
    },
    {
      parameters: {
        assignments: {
          assignments: [
            setAssign('s-ok', 'ok', '={{ true }}', 'boolean'),
            setAssign('s-wf', 'workflow', '={{ $json.workflow }}', 'object'),
            setAssign('s-res', 'resumo', '={{ $json.resumo }}'),
            setAssign('s-av', 'avisos', '={{ $json.avisos }}', 'array'),
            setAssign('s-tent', 'tentativa', '={{ $json.tentativa }}', 'number'),
          ],
        },
        options: {},
      },
      id: 'n-sucesso',
      name: 'Saída Sucesso',
      type: 'n8n-nodes-base.set',
      typeVersion: V.set,
      position: pos(1160, 100),
    },
    {
      parameters: { conditions: condRepetir(), options: {} },
      id: 'n-if-rep',
      name: 'pode repetir?',
      type: 'n8n-nodes-base.if',
      typeVersion: V.if,
      position: pos(1160, 320),
    },
    {
      parameters: {
        assignments: {
          assignments: [
            setAssign('r-nome', 'nomeFluxo', '={{ $(\'Normalizar Entrada\').first().json.nomeFluxo }}'),
            setAssign('r-gat', 'gatilho', '={{ $(\'Normalizar Entrada\').first().json.gatilho }}'),
            setAssign('r-aco', 'acoes', '={{ $(\'Normalizar Entrada\').first().json.acoes }}'),
            setAssign('r-det', 'detalhes', '={{ $(\'Normalizar Entrada\').first().json.detalhes }}'),
            setAssign('r-fb', 'feedback', '={{ $(\'Normalizar Entrada\').first().json.feedback }}'),
            setAssign('r-err', 'errosAnteriores', '={{ $json.erros }}', 'array'),
            setAssign('r-tent', 'tentativa', '={{ $json.tentativa + 1 }}', 'number'),
          ],
        },
        options: {},
      },
      id: 'n-nova',
      name: 'Nova Tentativa',
      type: 'n8n-nodes-base.set',
      typeVersion: V.set,
      position: pos(1420, 420),
    },
    {
      parameters: {
        assignments: {
          assignments: [
            setAssign('f-ok', 'ok', '={{ false }}', 'boolean'),
            setAssign('f-err', 'erros', '={{ $json.erros }}', 'array'),
            setAssign('f-imp', 'impossivel', '={{ $json.impossivel === true }}', 'boolean'),
            setAssign('f-mot', 'motivo', '={{ $json.motivo ?? "" }}'),
            setAssign('f-tent', 'tentativa', '={{ $json.tentativa }}', 'number'),
          ],
        },
        options: {},
      },
      id: 'n-falha',
      name: 'Saída Falha',
      type: 'n8n-nodes-base.set',
      typeVersion: V.set,
      position: pos(1420, 200),
    },
  ];

  const connections: Record<string, unknown> = {
    'When Executed by Another Workflow': { main: [[{ node: 'Normalizar Entrada', type: 'main', index: 0 }]] },
    'Webhook Dry-Run': { main: [[{ node: 'Normalizar Entrada', type: 'main', index: 0 }]] },
    'Normalizar Entrada': { main: [[{ node: 'Montar Prompt', type: 'main', index: 0 }]] },
    'Montar Prompt': { main: [[{ node: 'Gerar JSON (LLM)', type: 'main', index: 0 }]] },
    'OpenAI Chat Model': { ai_languageModel: [[{ node: 'Gerar JSON (LLM)', type: 'ai_languageModel', index: 0 }]] },
    'Gerar JSON (LLM)': { main: [[{ node: 'Validar e Sanitizar', type: 'main', index: 0 }]] },
    'Validar e Sanitizar': { main: [[{ node: 'ok?', type: 'main', index: 0 }]] },
    'ok?': {
      main: [
        [{ node: 'Saída Sucesso', type: 'main', index: 0 }], // true
        [{ node: 'pode repetir?', type: 'main', index: 0 }], // false
      ],
    },
    'pode repetir?': {
      main: [
        [{ node: 'Nova Tentativa', type: 'main', index: 0 }], // true
        [{ node: 'Saída Falha', type: 'main', index: 0 }], // false
      ],
    },
    'Nova Tentativa': { main: [[{ node: 'Montar Prompt', type: 'main', index: 0 }]] },
  };

  return { name: NOME, nodes, connections, settings: { executionOrder: 'v1' } };
}

async function main(): Promise<void> {
  const cliente = criarCliente();
  const wf = build();

  // Reusa o workflow existente (mesmo nome), se houver.
  const lista = await cliente.listarWorkflows(100);
  const existente = lista.data.find((w) => w.name === NOME);

  let id: string;
  if (existente) {
    await cliente.request(`/workflows/${existente.id}`, { method: 'PUT', body: JSON.stringify(wf) });
    id = existente.id;
    console.log(`Atualizado: [${id}] ${NOME}`);
  } else {
    const criado = await cliente.request<{ id: string }>('/workflows', { method: 'POST', body: JSON.stringify(wf) });
    id = criado.id;
    console.log(`Criado: [${id}] ${NOME}`);
  }

  // Atualiza o manifesto
  const manifesto: Array<{ id: string; arquivo: string }> = fs.existsSync(MANIFESTO)
    ? JSON.parse(fs.readFileSync(MANIFESTO, 'utf8'))
    : [];
  const semEste = manifesto.filter((m) => m.arquivo !== 'nucleo-gerador.json');
  semEste.push({ id, arquivo: 'nucleo-gerador.json' });
  fs.writeFileSync(MANIFESTO, JSON.stringify(semEste, null, 2) + '\n');

  console.log(`Abrir: http://localhost:5678/workflow/${id}`);
}

main().catch((e) => {
  console.error('Falha:', e.message);
  if ((e as { corpo?: string }).corpo) console.error('Corpo:', (e as { corpo?: string }).corpo);
  process.exit(1);
});
