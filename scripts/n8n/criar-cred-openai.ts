/** Cria a credencial openAiApi na instância e atualiza .credenciais.json. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv, obrigatorio } from './lib/env.ts';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(__dirname, '..', '.env');
const MAPA = path.join(__dirname, '.credenciais.json');

const apiKey = obrigatorio(lerEnv(ENV), 'OPENAI_API_KEY');
const cliente = criarCliente();

const mapa = fs.existsSync(MAPA) ? JSON.parse(fs.readFileSync(MAPA, 'utf8')) : {};
if (mapa.openAiApi) {
  console.log(`openAiApi já existe: ${mapa.openAiApi.id}`);
  process.exit(0);
}

try {
  const r = await cliente.request<{ id: string }>('/credentials', {
    method: 'POST',
    body: JSON.stringify({ name: 'OpenAI Meta-Fluxo', type: 'openAiApi', data: { apiKey } }),
  });
  mapa.openAiApi = { id: r.id, name: 'OpenAI Meta-Fluxo' };
  fs.writeFileSync(MAPA, JSON.stringify(mapa, null, 2) + '\n');
  console.log(`OK openAiApi -> ${r.id}`);
} catch (e) {
  console.error('Falha:', (e as Error).message);
  const corpo = (e as { corpo?: string }).corpo;
  if (corpo) console.error(corpo.slice(0, 300));
  process.exit(1);
}
