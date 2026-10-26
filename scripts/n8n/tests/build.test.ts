import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { test, before } from 'node:test';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.resolve(__dirname, '..', '..');
const CODE_DIR = path.resolve(SCRIPTS, '..', 'n8n', 'code');

before(() => {
  // Garante que os bundles estão atualizados antes de testar.
  execFileSync('npx', ['tsx', 'n8n/build-code-nodes.ts'], { cwd: SCRIPTS, stdio: 'ignore', shell: true });
});

/** Executa um bundle de Code node num sandbox com $input/$() simulados. */
function rodarBundle(
  arquivo: string,
  inputJson: unknown,
  refs: Record<string, unknown> = {},
): unknown {
  const codigo = fs.readFileSync(path.join(CODE_DIR, arquivo), 'utf8');
  const $input = {
    first: () => ({ json: inputJson }),
    all: () => [{ json: inputJson }],
  };
  const $ = (nome: string) => ({
    last: () => ({ json: refs[nome] ?? {} }),
    first: () => ({ json: refs[nome] ?? {} }),
  });
  // Sandbox restrito: sem require, process, module, $env.
  const sandbox: Record<string, unknown> = { $input, $, console };
  const ctx = vm.createContext(sandbox);
  // Embrulha para capturar o `return` final do Code node.
  const wrapped = `(function(){\n${codigo}\n})()`;
  return vm.runInContext(wrapped, ctx, { timeout: 5000 });
}

const PEDIDO = {
  nomeFluxo: 'Teste',
  gatilho: 'Webhook',
  acoes: 'fazer algo',
  detalhes: '',
  errosAnteriores: [],
  tentativa: 1,
};

test('nenhum bundle referencia require, process ou $env', () => {
  for (const f of ['montar-prompt.js', 'validar-workflow.js', 'preview-html.js']) {
    const c = fs.readFileSync(path.join(CODE_DIR, f), 'utf8');
    // Remove comentários e strings (onde pode haver menção textual a $env/require, ex.: descrições do catálogo)
    const corpo = c
      .replace(/^\/\/.*$/gm, '')
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''");
    assert.ok(!/\brequire\s*\(/.test(corpo), `${f} usa require`);
    assert.ok(!/\bprocess\./.test(corpo), `${f} usa process`);
    assert.ok(!/\$env[.[]/.test(corpo), `${f} usa $env`);
    assert.ok(!/\bmodule\.exports\b/.test(corpo), `${f} usa module.exports`);
  }
});

test('montar-prompt.js gera systemPrompt e userPrompt', () => {
  const out = rodarBundle('montar-prompt.js', PEDIDO) as Array<{ json: Record<string, unknown> }>;
  assert.ok(Array.isArray(out));
  const j = out[0].json;
  assert.equal(typeof j.systemPrompt, 'string');
  assert.equal(typeof j.userPrompt, 'string');
  assert.ok((j.systemPrompt as string).includes('n8n-nodes-base.webhook'));
  assert.equal(j.nomeFluxo, 'Teste'); // preserva o estado
});

test('validar-workflow.js valida a resposta da LLM usando $(Montar Prompt)', () => {
  const resposta = JSON.stringify({
    nodes: [
      { name: 'W', type: 'n8n-nodes-base.webhook', parameters: { httpMethod: 'POST', path: 'p' } },
      { name: 'S', type: 'n8n-nodes-base.set', parameters: { assignments: { assignments: [] }, options: {} } },
    ],
    connections: { W: { main: [[{ node: 'S', type: 'main', index: 0 }]] } },
  });
  const out = rodarBundle(
    'validar-workflow.js',
    { text: resposta },
    { 'Montar Prompt': { nomeFluxo: 'Meu', tentativa: 2 } },
  ) as Array<{ json: Record<string, unknown> }>;
  const j = out[0].json;
  assert.equal(j.ok, true);
  assert.equal((j.workflow as { name: string }).name, '[IA] Meu');
  assert.equal(j.tentativa, 2);
});

test('validar-workflow.js detecta tipo fora do catálogo', () => {
  const resposta = JSON.stringify({
    nodes: [{ name: 'X', type: 'n8n-nodes-base.foobar', parameters: {} }],
    connections: {},
  });
  const out = rodarBundle('validar-workflow.js', { text: resposta }, { 'Montar Prompt': { nomeFluxo: 'N' } }) as Array<{ json: Record<string, unknown> }>;
  assert.equal(out[0].json.ok, false);
});

test('preview-html.js gera previewHtml escapado', () => {
  const workflow = {
    name: 'Meu <x>',
    nodes: [{ name: 'A', type: 'n8n-nodes-base.webhook' }],
    connections: {},
  };
  const out = rodarBundle('preview-html.js', { workflow, rodada: 1 }) as Array<{ json: Record<string, unknown> }>;
  const html = out[0].json.previewHtml as string;
  assert.match(html, /Pré-visualização/);
  assert.match(html, /Meu &lt;x&gt;/);
});
