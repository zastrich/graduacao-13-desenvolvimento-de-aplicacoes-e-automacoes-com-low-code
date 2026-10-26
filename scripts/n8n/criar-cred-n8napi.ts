/** Cria a credencial n8nApi (para o nó n8n → Workflow Create) e atualiza .credenciais.json. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv, obrigatorio } from './lib/env.ts';
import { criarCliente, carregarConfig } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(__dirname, '..', '.env');
const MAPA = path.join(__dirname, '.credenciais.json');

const env = lerEnv(ENV);
const { baseUrl } = carregarConfig(env);
const apiKey = obrigatorio(env, 'N8N_API_KEY');
const cliente = criarCliente();

const mapa = fs.existsSync(MAPA) ? JSON.parse(fs.readFileSync(MAPA, 'utf8')) : {};
if (mapa.n8nApi) {
  console.log(`n8nApi já existe: ${mapa.n8nApi.id}`);
  process.exit(0);
}

try {
  const r = await cliente.request<{ id: string }>('/credentials', {
    method: 'POST',
    body: JSON.stringify({
      name: 'n8n API (local)',
      type: 'n8nApi',
      data: { apiKey, baseUrl: `${baseUrl.replace(/\/+$/, '')}/api/v1` },
    }),
  });
  mapa.n8nApi = { id: r.id, name: 'n8n API (local)' };
  fs.writeFileSync(MAPA, JSON.stringify(mapa, null, 2) + '\n');
  console.log(`OK n8nApi -> ${r.id}`);
} catch (e) {
  console.error('Falha:', (e as Error).message);
  const corpo = (e as { corpo?: string }).corpo;
  if (corpo) console.error(corpo.slice(0, 300));
  process.exit(1);
}
