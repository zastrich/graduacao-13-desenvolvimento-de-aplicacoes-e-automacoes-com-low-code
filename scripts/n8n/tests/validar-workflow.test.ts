import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  extrairJson,
  validarWorkflow,
  type EntradaCatalogo,
} from '../lib/validar-workflow.ts';
import { calcularPosicoes } from '../lib/layout.ts';
import { uuidV4 } from '../lib/uuid.ts';

const catalogo: EntradaCatalogo[] = [
  { type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.4, categoria: 'gatilho', obrigatorios: ['rule'] },
  { type: 'n8n-nodes-base.webhook', typeVersion: 2.2, categoria: 'gatilho', obrigatorios: ['httpMethod', 'path'] },
  { type: 'n8n-nodes-base.set', typeVersion: 3.5, categoria: 'acao', obrigatorios: [] },
  { type: 'n8n-nodes-base.httpRequest', typeVersion: 4.5, categoria: 'acao', obrigatorios: ['url'] },
  { type: 'n8n-nodes-base.gmail', typeVersion: 2.2, categoria: 'acao', obrigatorios: ['resource', 'operation'] },
];

function wfValido(): string {
  return JSON.stringify({
    nodes: [
      { name: 'Gatilho', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: { interval: [{ field: 'hours' }] } } },
      { name: 'Buscar', type: 'n8n-nodes-base.httpRequest', parameters: { url: 'https://x.com' } },
    ],
    connections: { Gatilho: { main: [[{ node: 'Buscar', type: 'main', index: 0 }]] } },
  });
}

// --- extrairJson ---

test('extrairJson lê JSON puro', () => {
  const { obj } = extrairJson('{"a":1}');
  assert.deepEqual(obj, { a: 1 });
});

test('extrairJson tolera cercas ```json', () => {
  const { obj } = extrairJson('```json\n{"a":1}\n```');
  assert.deepEqual(obj, { a: 1 });
});

test('extrairJson tolera texto antes e depois', () => {
  const { obj } = extrairJson('Claro! Aqui está:\n{"a":1}\nEspero ter ajudado.');
  assert.deepEqual(obj, { a: 1 });
});

test('extrairJson falha claramente sem JSON', () => {
  const { obj, erro } = extrairJson('sem json aqui');
  assert.equal(obj, null);
  assert.match(erro!, /Nenhum objeto JSON/);
});

// --- validarWorkflow ---

test('workflow válido é sanitizado com sucesso', () => {
  const r = validarWorkflow(wfValido(), catalogo, 'Meu Fluxo');
  assert.equal(r.ok, true);
  assert.equal(r.workflow!.name, '[IA] Meu Fluxo');
  assert.equal(r.workflow!.settings.executionOrder, 'v1');
  assert.equal(r.workflow!.nodes.length, 2);
  assert.equal(r.workflow!.nodes[0].typeVersion, 1.4); // forçado do catálogo
});

test('aceita JSON em cercas de código', () => {
  const r = validarWorkflow('```json\n' + wfValido() + '\n```', catalogo, 'X');
  assert.equal(r.ok, true);
});

test('rejeita tipo fora do catálogo', () => {
  const wf = JSON.stringify({
    nodes: [
      { name: 'T', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: {} } },
      { name: 'Z', type: 'n8n-nodes-base.inexistente', parameters: {} },
    ],
    connections: {},
  });
  const r = validarWorkflow(wf, catalogo, 'X');
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => /não está no catálogo/.test(e)));
});

test('rejeita conexão para nó inexistente', () => {
  const wf = JSON.stringify({
    nodes: [{ name: 'T', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: {} } }],
    connections: { T: { main: [[{ node: 'Fantasma', type: 'main', index: 0 }]] } },
  });
  const r = validarWorkflow(wf, catalogo, 'X');
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => /Fantasma/.test(e)));
});

test('rejeita nomes duplicados', () => {
  const wf = JSON.stringify({
    nodes: [
      { name: 'Igual', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: {} } },
      { name: 'Igual', type: 'n8n-nodes-base.set', parameters: {} },
    ],
    connections: {},
  });
  const r = validarWorkflow(wf, catalogo, 'X');
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => /duplicado/.test(e)));
});

test('rejeita workflow sem gatilho', () => {
  const wf = JSON.stringify({
    nodes: [{ name: 'S', type: 'n8n-nodes-base.set', parameters: {} }],
    connections: {},
  });
  const r = validarWorkflow(wf, catalogo, 'X');
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => /gatilho/.test(e)));
});

test('rejeita parâmetro obrigatório ausente', () => {
  const wf = JSON.stringify({
    nodes: [
      { name: 'T', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: {} } },
      { name: 'H', type: 'n8n-nodes-base.httpRequest', parameters: {} }, // falta url
    ],
    connections: {},
  });
  const r = validarWorkflow(wf, catalogo, 'X');
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => /url/.test(e)));
});

test('remove campos proibidos (id/active/tags/pinData) do nó', () => {
  const wf = JSON.stringify({
    nodes: [
      { name: 'T', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: {} }, id: 'ABC', active: true, tags: ['x'], pinData: {} },
    ],
    connections: {},
  });
  const r = validarWorkflow(wf, catalogo, 'X');
  assert.equal(r.ok, true);
  const no = r.workflow!.nodes[0] as Record<string, unknown>;
  assert.notEqual(no.id, 'ABC'); // id regerado
  assert.equal(no.active, undefined);
  assert.equal(no.tags, undefined);
  assert.equal(no.pinData, undefined);
});

test('ignora settings extras e força executionOrder v1', () => {
  const wf = JSON.stringify({
    nodes: [{ name: 'T', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: {} } }],
    connections: {},
    settings: { executionOrder: 'v0', timezone: 'X', saveDataSuccessExecution: 'none' },
  });
  const r = validarWorkflow(wf, catalogo, 'X');
  assert.equal(r.ok, true);
  assert.deepEqual(r.workflow!.settings, { executionOrder: 'v1' });
});

test('detecta impossivel:true sem tentar sanitizar', () => {
  const r = validarWorkflow('{"impossivel": true, "motivo": "pedido não é automação"}', catalogo, 'X');
  assert.equal(r.ok, false);
  assert.equal(r.impossivel, true);
  assert.match(r.motivo!, /automação/);
});

test('gera UUID para id e webhookId em nós de webhook/form', () => {
  const wf = JSON.stringify({
    nodes: [{ name: 'W', type: 'n8n-nodes-base.webhook', parameters: { httpMethod: 'POST', path: 'p' } }],
    connections: {},
  });
  const r = validarWorkflow(wf, catalogo, 'X');
  assert.equal(r.ok, true);
  const no = r.workflow!.nodes[0];
  assert.match(no.id!, /^[0-9a-f-]{36}$/);
  assert.match(no.webhookId!, /^[0-9a-f-]{36}$/);
});

test('aceita nós de IA com conexão ai_languageModel e anexa credencial do Gemini', () => {
  const catIA: EntradaCatalogo[] = [
    ...catalogo,
    { type: '@n8n/n8n-nodes-langchain.chainLlm', typeVersion: 1.9, categoria: 'ia', obrigatorios: ['text'] },
    { type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', typeVersion: 1.3, categoria: 'ia', obrigatorios: [] },
  ];
  const wf = JSON.stringify({
    nodes: [
      { name: 'Gatilho', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: {} } },
      { name: 'Avaliar', type: '@n8n/n8n-nodes-langchain.chainLlm', parameters: { text: 'oi' } },
      { name: 'Modelo', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', parameters: {} },
    ],
    connections: {
      Gatilho: { main: [[{ node: 'Avaliar', type: 'main', index: 0 }]] },
      Modelo: { ai_languageModel: [[{ node: 'Avaliar', type: 'ai_languageModel', index: 0 }]] },
    },
  });
  const r = validarWorkflow(wf, catIA, 'Fluxo IA', { credIA: { tipo: 'openAiApi', id: 'cred123', name: 'OpenAI' } });
  assert.equal(r.ok, true);
  const chat = r.workflow!.nodes.find((n) => n.type.endsWith('lmChatOpenAi') || n.type.endsWith('lmChatGoogleGemini'))!;
  assert.deepEqual((chat as { credentials?: unknown }).credentials, { openAiApi: { id: 'cred123', name: 'OpenAI' } });
});

test('normaliza conexões de If com portas true/false para main[0]/main[1]', () => {
  const catIf: EntradaCatalogo[] = [
    ...catalogo,
    { type: 'n8n-nodes-base.if', typeVersion: 2.3, categoria: 'acao', obrigatorios: [] },
  ];
  const wf = JSON.stringify({
    nodes: [
      { name: 'T', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: {} } },
      { name: 'Decidir', type: 'n8n-nodes-base.if', parameters: { conditions: {} } },
      { name: 'Sim', type: 'n8n-nodes-base.set', parameters: {} },
      { name: 'Nao', type: 'n8n-nodes-base.set', parameters: {} },
    ],
    connections: {
      T: { main: [[{ node: 'Decidir', type: 'main', index: 0 }]] },
      Decidir: {
        main: [[{ node: 'Sim', type: 'main', index: 0 }]],
        false: [[{ node: 'Nao', type: 'main', index: 0 }]],
      },
    },
  });
  const r = validarWorkflow(wf, catIf, 'X');
  assert.equal(r.ok, true);
  const dec = r.workflow!.connections['Decidir'] as Record<string, unknown>;
  assert.equal('false' in dec, false, 'porta "false" deve ter sido removida');
  const main = dec.main as Array<Array<{ node: string }>>;
  assert.equal(main[0][0].node, 'Sim');
  assert.equal(main[1][0].node, 'Nao');
});

test('conexão ai_languageModel para nó inexistente é rejeitada', () => {
  const catIA: EntradaCatalogo[] = [
    ...catalogo,
    { type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', typeVersion: 1.3, categoria: 'ia', obrigatorios: [] },
  ];
  const wf = JSON.stringify({
    nodes: [
      { name: 'Gatilho', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: {} } },
      { name: 'Modelo', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', parameters: {} },
    ],
    connections: { Modelo: { ai_languageModel: [[{ node: 'Fantasma', type: 'ai_languageModel', index: 0 }]] } },
  });
  const r = validarWorkflow(wf, catIA, 'X');
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => /Fantasma/.test(e)));
});

test('emite aviso para nós que precisam de credencial', () => {
  const wf = JSON.stringify({
    nodes: [
      { name: 'T', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: {} } },
      { name: 'Email', type: 'n8n-nodes-base.gmail', parameters: { resource: 'message', operation: 'send' } },
    ],
    connections: { T: { main: [[{ node: 'Email', type: 'main', index: 0 }]] } },
  });
  const r = validarWorkflow(wf, catalogo, 'X');
  assert.equal(r.ok, true);
  assert.ok(r.avisos.some((a) => /credencial/.test(a)));
});

// --- uuid e layout ---

test('uuidV4 gera formato válido e valores distintos', () => {
  const a = uuidV4();
  const b = uuidV4();
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(a, b);
});

test('calcularPosicoes distribui em colunas por profundidade (sem sobreposição)', () => {
  const nomes = ['A', 'B', 'C'];
  const conns = {
    A: { main: [[{ node: 'B' }]] },
    B: { main: [[{ node: 'C' }]] },
  };
  const pos = calcularPosicoes(nomes, conns);
  assert.ok(pos.get('A')![0] < pos.get('B')![0]);
  assert.ok(pos.get('B')![0] < pos.get('C')![0]);
  // nenhuma posição repetida
  const chaves = [...pos.values()].map((p) => p.join(','));
  assert.equal(new Set(chaves).size, chaves.length);
});
