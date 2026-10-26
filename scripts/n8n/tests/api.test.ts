import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  montarUrl,
  montarHeaders,
  carregarConfig,
  ClienteN8n,
  ErroApi,
} from '../lib/api.ts';

test('montarUrl prefixa /api/v1 e normaliza barras', () => {
  assert.equal(montarUrl('http://localhost:5678', '/workflows'), 'http://localhost:5678/api/v1/workflows');
  assert.equal(montarUrl('http://localhost:5678/', 'workflows'), 'http://localhost:5678/api/v1/workflows');
  assert.equal(montarUrl('http://localhost:5678///', '/x'), 'http://localhost:5678/api/v1/x');
});

test('montarHeaders inclui a API key e o content-type', () => {
  const h = montarHeaders('abc123');
  assert.equal(h['X-N8N-API-KEY'], 'abc123');
  assert.equal(h['content-type'], 'application/json');
});

test('carregarConfig lê N8N_URL e N8N_API_KEY de um mapa', () => {
  const cfg = carregarConfig({ N8N_URL: 'http://x:1', N8N_API_KEY: 'k' });
  assert.deepEqual(cfg, { baseUrl: 'http://x:1', apiKey: 'k' });
});

test('carregarConfig lança erro claro quando a chave está ausente', () => {
  assert.throws(() => carregarConfig({ N8N_URL: 'http://x:1' }), /N8N_API_KEY/);
  assert.throws(() => carregarConfig({ N8N_API_KEY: 'k' }), /N8N_URL/);
});

function fakeFetch(status: number, body: string): typeof fetch {
  return (async (_url: string, _init?: RequestInit) =>
    new Response(body, { status })) as unknown as typeof fetch;
}

test('listarWorkflows faz parse do corpo JSON', async () => {
  const cliente = new ClienteN8n(
    { baseUrl: 'http://x:1', apiKey: 'k' },
    fakeFetch(200, JSON.stringify({ data: [{ id: '1', name: 'A', active: false }] })),
  );
  const r = await cliente.listarWorkflows();
  assert.equal(r.data.length, 1);
  assert.equal(r.data[0].name, 'A');
});

test('a chamada envia a API key no header', async () => {
  let capturado: Record<string, string> = {};
  const fetchImpl = (async (_url: string, init?: RequestInit) => {
    capturado = (init?.headers ?? {}) as Record<string, string>;
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  }) as unknown as typeof fetch;
  const cliente = new ClienteN8n({ baseUrl: 'http://x:1', apiKey: 'segredo' }, fetchImpl);
  await cliente.listarWorkflows();
  assert.equal(capturado['X-N8N-API-KEY'], 'segredo');
});

test('HTTP 401 vira ErroApi com mensagem amigável', async () => {
  const cliente = new ClienteN8n({ baseUrl: 'http://x:1', apiKey: 'k' }, fakeFetch(401, 'unauthorized'));
  await assert.rejects(
    () => cliente.listarWorkflows(),
    (e: unknown) => e instanceof ErroApi && e.status === 401 && /401/.test(e.message),
  );
});

test('HTTP 404 vira ErroApi com o caminho', async () => {
  const cliente = new ClienteN8n({ baseUrl: 'http://x:1', apiKey: 'k' }, fakeFetch(404, 'not found'));
  await assert.rejects(
    () => cliente.obterWorkflow('zzz'),
    (e: unknown) => e instanceof ErroApi && e.status === 404,
  );
});
