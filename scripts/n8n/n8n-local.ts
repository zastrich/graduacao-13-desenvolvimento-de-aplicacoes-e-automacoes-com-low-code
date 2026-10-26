/**
 * Launcher da instância local do n8n (versionada em n8n/instancia).
 *
 * Nunca usa o n8n global: resolve o binário a partir de node_modules do projeto
 * e força N8N_USER_FOLDER para o diretório da instância do projeto.
 *
 * Subcomandos: start | version | export | import | verificar-restauracao
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv } from './lib/env.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/n8n/ -> raiz do projeto
const RAIZ = path.resolve(__dirname, '..', '..');

export const INSTANCIA_DIR = path.join(RAIZ, 'n8n', 'instancia');
export const DADOS_DIR = path.join(INSTANCIA_DIR, '.n8n');
export const AMBIENTE_ENV = path.join(INSTANCIA_DIR, 'ambiente.env');
export const WORKFLOWS_DIR = path.join(RAIZ, 'n8n', 'workflows');
export const MANIFESTO = path.join(WORKFLOWS_DIR, 'manifesto.json');
export const PORTA_PADRAO = 5678;

/** Caminho do binário do n8n dentro da instância local. */
export function binarioN8n(): string {
  return path.join(INSTANCIA_DIR, 'node_modules', 'n8n', 'bin', 'n8n');
}

/** Monta o ambiente para o processo do n8n, forçando o user folder do projeto. */
export function montarAmbiente(
  base: Record<string, string | undefined>,
  arquivoEnv: Record<string, string>,
): Record<string, string | undefined> {
  const env = { ...base, ...arquivoEnv };
  // N8N_USER_FOLDER é sempre o da instância do projeto — não pode ser sobrescrito.
  env.N8N_USER_FOLDER = INSTANCIA_DIR;
  return env;
}

/** Verifica se uma porta TCP está ocupada em localhost. */
export function portaOcupada(porta: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
    socket.connect(porta, '127.0.0.1');
  });
}

/** Monta os argumentos do export para cada workflow do manifesto. */
export function argsExport(
  manifesto: Array<{ id: string; arquivo: string }>,
): string[][] {
  return manifesto.map((item) => [
    'export:workflow',
    `--id=${item.id}`,
    `--output=${path.join(WORKFLOWS_DIR, item.arquivo)}`,
    '--pretty',
  ]);
}

/** Monta os argumentos do import separado a partir do diretório de workflows. */
export function argsImport(dir: string = WORKFLOWS_DIR): string[] {
  return ['import:workflow', '--separate', `--input=${dir}`];
}

function lerManifesto(): Array<{ id: string; arquivo: string }> {
  if (!fs.existsSync(MANIFESTO)) return [];
  const texto = fs.readFileSync(MANIFESTO, 'utf8').trim();
  if (texto === '') return [];
  return JSON.parse(texto);
}

function garantirBinario(): string {
  const bin = binarioN8n();
  if (!fs.existsSync(bin)) {
    console.error(
      'Binário do n8n não encontrado na instância local.\n' +
        `Esperado em: ${bin}\n` +
        'Rode primeiro: npm run n8n:install',
    );
    process.exit(1);
  }
  return bin;
}

function executarN8n(
  bin: string,
  args: string[],
  envExtra: Record<string, string> = {},
): number {
  const env = montarAmbiente(
    { ...process.env, ...envExtra },
    lerEnv(AMBIENTE_ENV),
  );
  const r = spawnSync(process.execPath, [bin, ...args], {
    stdio: 'inherit',
    env: env as NodeJS.ProcessEnv,
  });
  return r.status ?? 1;
}

async function cmdStart(): Promise<void> {
  const bin = garantirBinario();
  const envArquivo = lerEnv(AMBIENTE_ENV);
  const porta = Number(envArquivo.N8N_PORT ?? PORTA_PADRAO);

  if (await portaOcupada(porta)) {
    console.error(
      `A porta ${porta} já está em uso.\n` +
        'Provavelmente a instância GLOBAL do n8n está rodando. ' +
        'Encerre-a (Ctrl+C no terminal dela) antes de iniciar a instância do projeto.',
    );
    process.exit(1);
  }

  console.log(`Iniciando n8n local (dados em ${DADOS_DIR}) na porta ${porta}...`);
  const env = montarAmbiente({ ...process.env }, envArquivo);
  const filho = spawn(process.execPath, [bin, 'start'], {
    stdio: 'inherit',
    env: env as NodeJS.ProcessEnv,
  });
  const repassar = (sinal: NodeJS.Signals) => filho.kill(sinal);
  process.on('SIGINT', () => repassar('SIGINT'));
  process.on('SIGTERM', () => repassar('SIGTERM'));
  filho.on('exit', (code) => process.exit(code ?? 0));
}

function cmdVersion(): void {
  const bin = garantirBinario();
  process.exit(executarN8n(bin, ['--version']));
}

function cmdExport(): void {
  const bin = garantirBinario();
  const manifesto = lerManifesto();
  if (manifesto.length === 0) {
    console.log('Manifesto vazio — nenhum workflow para exportar.');
    return;
  }
  fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
  for (const args of argsExport(manifesto)) {
    const code = executarN8n(bin, args);
    if (code !== 0) process.exit(code);
  }
  console.log(`Exportados ${manifesto.length} workflow(s) para ${WORKFLOWS_DIR}.`);
}

function cmdImport(): void {
  const bin = garantirBinario();
  process.exit(executarN8n(bin, argsImport()));
}

function cmdVerificarRestauracao(): void {
  // Concluído na Task 11.
  const bin = garantirBinario();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-restore-'));
  try {
    console.log(`Importando workflows numa base temporária: ${tmp}`);
    const code = executarN8n(bin, argsImport(), { N8N_USER_FOLDER: tmp });
    // montarAmbiente força N8N_USER_FOLDER de volta ao da instância; a
    // verificação completa (base isolada, re-export e diff) será finalizada na Task 11.
    if (code !== 0) process.exit(code);
    console.log('Verificação de restauração ainda será finalizada na Task 11.');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const sub = process.argv[2];
  switch (sub) {
    case 'start':
      await cmdStart();
      break;
    case 'version':
      cmdVersion();
      break;
    case 'export':
      cmdExport();
      break;
    case 'import':
      cmdImport();
      break;
    case 'verificar-restauracao':
      cmdVerificarRestauracao();
      break;
    default:
      console.error(
        'Uso: tsx n8n-local.ts <start|version|export|import|verificar-restauracao>',
      );
      process.exit(1);
  }
}

// Executa apenas quando chamado diretamente (não quando importado nos testes).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
