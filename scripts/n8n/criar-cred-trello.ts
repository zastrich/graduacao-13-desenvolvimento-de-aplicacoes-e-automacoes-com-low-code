/** Cria a credencial trelloApi na instância e atualiza .credenciais.json. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv, obrigatorio } from './lib/env.ts';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(__dirname, '..', '.env');
const MAPA = path.join(__dirname, '.credenciais.json');

const env = lerEnv(ENV);
const apiKey = obrigatorio(env, 'TRELLO_API_KEY');
const apiToken = obrigatorio(env, 'TRELLO_TOKEN');
const cliente = criarCliente();

const mapa = fs.existsSync(MAPA) ? JSON.parse(fs.readFileSync(MAPA, 'utf8')) : {};
if (mapa.trelloApi) {
  console.log(`trelloApi já existe: ${mapa.trelloApi.id}`);
  process.exit(0);
}

try {
  const r = await cliente.request<{ id: string }>('/credentials', {
    method: 'POST',
    body: JSON.stringify({ name: 'Trello Reclamações', type: 'trelloApi', data: { apiKey, apiToken } }),
  });
  mapa.trelloApi = { id: r.id, name: 'Trello Reclamações' };
  fs.writeFileSync(MAPA, JSON.stringify(mapa, null, 2) + '\n');
  console.log(`OK trelloApi -> ${r.id}`);
} catch (e) {
  console.error('Falha:', (e as Error).message);
  const corpo = (e as { corpo?: string }).corpo;
  if (corpo) console.error(corpo.slice(0, 400));
  process.exit(1);
}
