/**
 * Task 8/9 — cria credenciais na instância via Public API e imprime os IDs.
 * - googlePalmApi (Gemini) a partir de GEMINI_API_KEY
 * - httpHeaderAuth (webhook dry-run) a partir de DRY_RUN_TOKEN
 * - httpBasicAuth (form do Criador) com usuário/senha de teste
 *
 * Não ecoa valores de segredo. Imprime apenas nome, tipo e ID.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv, obrigatorio } from './lib/env.ts';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(__dirname, '..', '.env');
// Arquivo local (não versionado) com os IDs das credenciais, consumido por montar-*.ts
export const MAPA_CREDS = path.join(__dirname, '.credenciais.json');

async function criar(
  cliente: ReturnType<typeof criarCliente>,
  nome: string,
  tipo: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  try {
    const r = await cliente.request<{ id: string }>('/credentials', {
      method: 'POST',
      body: JSON.stringify({ name: nome, type: tipo, data }),
    });
    console.log(`OK  ${tipo.padEnd(16)} "${nome}" -> id ${r.id}`);
    return r.id;
  } catch (e) {
    console.log(`ERRO ${tipo.padEnd(16)} "${nome}": ${(e as Error).message}`);
    const corpo = (e as { corpo?: string }).corpo;
    if (corpo) console.log('     ', corpo.slice(0, 200));
    return null;
  }
}

async function main(): Promise<void> {
  const env = lerEnv(ENV);
  const cliente = criarCliente();

  const geminiKey = obrigatorio(env, 'GEMINI_API_KEY');
  const dryToken = obrigatorio(env, 'DRY_RUN_TOKEN');

  const gemini = await criar(cliente, 'Gemini Meta-Fluxo', 'googlePalmApi', {
    host: 'https://generativelanguage.googleapis.com',
    apiKey: geminiKey,
  });
  const header = await criar(cliente, 'Dry-Run Header', 'httpHeaderAuth', {
    name: 'X-Dry-Run-Token',
    value: dryToken,
  });
  const basic = await criar(cliente, 'Criador Basic Auth', 'httpBasicAuth', {
    user: 'professor',
    password: 'entrega2026',
  });

  const mapa = {
    googlePalmApi: gemini ? { id: gemini, name: 'Gemini Meta-Fluxo' } : null,
    httpHeaderAuth: header ? { id: header, name: 'Dry-Run Header' } : null,
    httpBasicAuth: basic ? { id: basic, name: 'Criador Basic Auth' } : null,
  };
  fs.writeFileSync(MAPA_CREDS, JSON.stringify(mapa, null, 2) + '\n');
  console.log(`\nIDs salvos em ${path.relative(path.resolve(__dirname, '..', '..'), MAPA_CREDS)} (não versionado).`);
}

main().catch((e) => {
  console.error('Falha geral:', (e as Error).message);
  process.exit(1);
});
