import assert from 'node:assert/strict';
import net from 'node:net';
import path from 'node:path';
import { test } from 'node:test';
import {
  INSTANCIA_DIR,
  montarAmbiente,
  portaOcupada,
  binarioN8n,
  argsExport,
  argsImport,
  WORKFLOWS_DIR,
} from '../n8n-local.ts';

test('montarAmbiente força N8N_USER_FOLDER para a instância do projeto', () => {
  const env = montarAmbiente({ FOO: 'bar' }, {});
  assert.equal(env.N8N_USER_FOLDER, INSTANCIA_DIR);
  assert.equal(env.FOO, 'bar');
});

test('N8N_USER_FOLDER não pode ser sobrescrito pelo ambiente.env', () => {
  const env = montarAmbiente(
    { N8N_USER_FOLDER: '/outro/lugar' },
    { N8N_USER_FOLDER: 'C:\\hackeado' },
  );
  assert.equal(env.N8N_USER_FOLDER, INSTANCIA_DIR);
});

test('N8N_USER_FOLDER é absoluto e dentro do projeto', () => {
  const env = montarAmbiente({}, {});
  assert.ok(path.isAbsolute(env.N8N_USER_FOLDER as string));
  assert.ok((env.N8N_USER_FOLDER as string).includes(path.join('n8n', 'instancia')));
});

test('o binário resolve para node_modules da instância local (nunca o global)', () => {
  const bin = binarioN8n();
  assert.ok(bin.includes(path.join('instancia', 'node_modules', 'n8n')));
  assert.ok(path.isAbsolute(bin));
});

test('portaOcupada detecta porta em uso e porta livre', async () => {
  const servidor = net.createServer();
  await new Promise<void>((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  const porta = (servidor.address() as net.AddressInfo).port;

  assert.equal(await portaOcupada(porta), true);

  await new Promise<void>((resolve) => servidor.close(() => resolve()));
  assert.equal(await portaOcupada(porta), false);
});

test('argsExport monta um comando por item do manifesto', () => {
  const cmds = argsExport([
    { id: 'abc', arquivo: 'nucleo-gerador.json' },
    { id: 'def', arquivo: 'criador-fluxos.json' },
  ]);
  assert.equal(cmds.length, 2);
  assert.equal(cmds[0][0], 'export:workflow');
  assert.equal(cmds[0][1], '--id=abc');
  assert.equal(cmds[0][2], `--output=${path.join(WORKFLOWS_DIR, 'nucleo-gerador.json')}`);
  assert.equal(cmds[0][3], '--pretty');
});

test('argsImport usa --separate e o diretório de workflows', () => {
  const args = argsImport('/tmp/x');
  assert.deepEqual(args, ['import:workflow', '--separate', '--input=/tmp/x']);
});
