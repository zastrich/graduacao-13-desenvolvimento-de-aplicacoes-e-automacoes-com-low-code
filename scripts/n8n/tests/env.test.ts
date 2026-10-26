import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseEnv, obrigatorio } from '../lib/env.ts';

test('faz parse de pares chave=valor simples', () => {
  const r = parseEnv('A=1\nB=dois');
  assert.equal(r.A, '1');
  assert.equal(r.B, 'dois');
});

test('ignora linhas em branco e comentários', () => {
  const r = parseEnv('# comentário\n\nA=1\n   \n# outro\nB=2');
  assert.deepEqual(r, { A: '1', B: '2' });
});

test('remove aspas duplas e simples preservando o conteúdo', () => {
  const r = parseEnv('A="com espaço"\nB=\'outro valor\'');
  assert.equal(r.A, 'com espaço');
  assert.equal(r.B, 'outro valor');
});

test('preserva # dentro de aspas e corta comentário fora de aspas', () => {
  const r = parseEnv('A="valor # não é comentário"\nB=valor # comentário');
  assert.equal(r.A, 'valor # não é comentário');
  assert.equal(r.B, 'valor');
});

test('aceita prefixo export e remove espaços ao redor', () => {
  const r = parseEnv('export A = 1 \n  B =  2');
  assert.equal(r.A, '1');
  assert.equal(r.B, '2');
});

test('preserva = dentro do valor', () => {
  const r = parseEnv('URL=http://localhost:5678/api/v1?x=1');
  assert.equal(r.URL, 'http://localhost:5678/api/v1?x=1');
});

test('obrigatorio retorna o valor quando presente', () => {
  assert.equal(obrigatorio({ X: 'v' }, 'X'), 'v');
});

test('obrigatorio lança erro claro quando ausente ou vazio', () => {
  assert.throws(() => obrigatorio({}, 'N8N_API_KEY', 'Veja scripts/.env.example'), /N8N_API_KEY/);
  assert.throws(() => obrigatorio({ X: '   ' }, 'X'), /X/);
});
