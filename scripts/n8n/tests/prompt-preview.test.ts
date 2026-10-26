import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  montarSystemPrompt,
  montarUserPrompt,
  renderizarCatalogo,
  type NoCatalogoPrompt,
} from '../lib/montar-prompt.ts';
import { gerarPreviewHtml, escaparHtml, montarSequencias, tipoCurto } from '../lib/preview-html.ts';

const nos: NoCatalogoPrompt[] = [
  { type: 'n8n-nodes-base.webhook', typeVersion: 2.2, categoria: 'gatilho', descricao: 'Recebe HTTP.', obrigatorios: ['httpMethod', 'path'] },
  { type: 'n8n-nodes-base.set', typeVersion: 3.5, categoria: 'acao', descricao: 'Define campos.', obrigatorios: [] },
  { type: 'n8n-nodes-base.gmail', typeVersion: 2.2, categoria: 'acao', descricao: 'Envia e-mail.', obrigatorios: ['resource', 'operation'] },
];

// --- montar-prompt ---

test('o system prompt contém todos os tipos do catálogo', () => {
  const sp = montarSystemPrompt(nos);
  for (const n of nos) assert.ok(sp.includes(n.type), `faltou ${n.type}`);
});

test('o system prompt contém a regra de impossivel e o formato de conexões', () => {
  const sp = montarSystemPrompt(nos);
  assert.match(sp, /"impossivel": true/);
  assert.match(sp, /"main": \[\[\{ "node"/);
});

test('renderizarCatalogo mostra versão e obrigatórios', () => {
  const r = renderizarCatalogo(nos);
  assert.match(r, /n8n-nodes-base\.webhook \(v2\.2\) \[gatilho\]/);
  assert.match(r, /Obrigatórios: httpMethod, path/);
});

test('o user prompt inclui feedback e erros somente quando presentes', () => {
  const semExtra = montarUserPrompt({ nomeFluxo: 'X', acoes: 'fazer algo' });
  assert.ok(!/Feedback humano/.test(semExtra));
  assert.ok(!/Erros da tentativa/.test(semExtra));

  const comExtra = montarUserPrompt({
    nomeFluxo: 'X',
    acoes: 'fazer algo',
    feedback: 'mudar o horário',
    errosAnteriores: ['O nó "Z" usa tipo inválido'],
  });
  assert.match(comExtra, /Feedback humano para ajustar o fluxo: mudar o horário/);
  assert.match(comExtra, /Erros da tentativa anterior/);
  assert.match(comExtra, /tipo inválido/);
});

test('o user prompt respeita um teto de tamanho', () => {
  const grande = 'a'.repeat(20000);
  const up = montarUserPrompt({ nomeFluxo: 'X', acoes: grande });
  assert.ok(up.length <= 8100);
  assert.match(up, /truncado/);
});

// --- preview-html ---

test('escaparHtml neutraliza script e aspas', () => {
  const r = escaparHtml('<script>alert("x")</script>');
  assert.ok(!r.includes('<script>'));
  assert.match(r, /&lt;script&gt;/);
  assert.match(r, /&quot;/);
});

test('tipoCurto extrai a última parte do tipo', () => {
  assert.equal(tipoCurto('n8n-nodes-base.httpRequest'), 'httpRequest');
});

test('o preview escapa conteúdo da LLM (nome com script)', () => {
  const html = gerarPreviewHtml({
    name: '<script>alert(1)</script>',
    nodes: [{ name: 'A<b>', type: 'n8n-nodes-base.webhook' }],
    connections: {},
  });
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /A&lt;b&gt;/);
});

test('montarSequencias trata ramos (Switch com duas saídas) e loop', () => {
  const nodes = [
    { name: 'T', type: 'n8n-nodes-base.webhook' },
    { name: 'S', type: 'n8n-nodes-base.switch' },
    { name: 'Volta', type: 'n8n-nodes-base.set' },
    { name: 'Fim', type: 'n8n-nodes-base.set' },
  ];
  const conns = {
    T: { main: [[{ node: 'S' }]] },
    S: { main: [[{ node: 'Volta' }], [{ node: 'Fim' }]] },
    Volta: { main: [[{ node: 'S' }]] }, // loop de volta ao Switch
  };
  const seqs = montarSequencias(nodes, conns);
  assert.ok(seqs.length >= 2);
  assert.ok(seqs.some((s) => /Fim/.test(s)));
  assert.ok(seqs.some((s) => /↩ volta/.test(s)));
});

test('o preview inclui a rodada e os avisos quando fornecidos', () => {
  const html = gerarPreviewHtml(
    { name: 'F', nodes: [{ name: 'A', type: 'n8n-nodes-base.webhook' }], connections: {} },
    { rodada: 2, avisos: ['precisa credencial'] },
  );
  assert.match(html, /Rodada 2/);
  assert.match(html, /precisa credencial/);
});
