import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  carregarBase,
  mesclarVersoes,
  indexar,
  gatilhos,
  type CatalogoBase,
} from '../lib/catalogo.ts';

test('a base curada carrega e tem o formato esperado', () => {
  const base = carregarBase();
  assert.ok(base.nos.length >= 20, 'esperado ~24 nós');
  for (const n of base.nos) {
    assert.equal(typeof n.type, 'string');
    assert.ok(n.type.startsWith('n8n-nodes-base.') || n.type.startsWith('@n8n/n8n-nodes-langchain.'));
    assert.ok(['gatilho', 'acao', 'ia'].includes(n.categoria));
    assert.equal(typeof n.descricao, 'string');
    assert.ok(Array.isArray(n.obrigatorios));
    assert.equal(typeof n.precisaCredencial, 'boolean');
  }
});

test('os tipos da base são únicos', () => {
  const base = carregarBase();
  const tipos = base.nos.map((n) => n.type);
  assert.equal(new Set(tipos).size, tipos.length);
});

test('a base tem ao menos um gatilho', () => {
  const base = carregarBase();
  assert.ok(base.nos.some((n) => n.categoria === 'gatilho'));
});

const baseFake: CatalogoBase = {
  descricao: 'teste',
  nos: [
    { type: 'n8n-nodes-base.webhook', displayName: 'W', categoria: 'gatilho', descricao: 'd', obrigatorios: ['path'], exemplo: {}, precisaCredencial: false },
    { type: 'n8n-nodes-base.set', displayName: 'S', categoria: 'acao', descricao: 'd', obrigatorios: [], exemplo: {}, precisaCredencial: false },
  ],
};

test('mesclarVersoes anexa typeVersion numérico', () => {
  const cat = mesclarVersoes(baseFake, { 'n8n-nodes-base.webhook': 2.2, 'n8n-nodes-base.set': 3.5 });
  assert.equal(cat.nos[0].typeVersion, 2.2);
  assert.equal(cat.nos[1].typeVersion, 3.5);
  assert.equal(typeof cat.geradoEm, 'string');
});

test('mesclarVersoes falha quando falta versão de algum nó', () => {
  assert.throws(
    () => mesclarVersoes(baseFake, { 'n8n-nodes-base.webhook': 2.2 }),
    /n8n-nodes-base\.set/,
  );
});

test('indexar cria um mapa type -> nó', () => {
  const cat = mesclarVersoes(baseFake, { 'n8n-nodes-base.webhook': 2.2, 'n8n-nodes-base.set': 3.5 });
  const idx = indexar(cat);
  assert.equal(idx.get('n8n-nodes-base.set')?.typeVersion, 3.5);
  assert.equal(idx.has('n8n-nodes-base.inexistente'), false);
});

test('gatilhos filtra apenas a categoria gatilho', () => {
  const cat = mesclarVersoes(baseFake, { 'n8n-nodes-base.webhook': 2.2, 'n8n-nodes-base.set': 3.5 });
  const g = gatilhos(cat);
  assert.equal(g.length, 1);
  assert.equal(g[0].type, 'n8n-nodes-base.webhook');
});

test('todas as versões reais estão presentes no arquivo de versões', async () => {
  const base = carregarBase();
  const versoes = (await import('../../../n8n/catalogo/catalogo-versoes.json', { with: { type: 'json' } })).default as Record<string, number>;
  const cat = mesclarVersoes(base, versoes);
  assert.equal(cat.nos.length, base.nos.length);
  for (const n of cat.nos) assert.equal(typeof n.typeVersion, 'number');
});
