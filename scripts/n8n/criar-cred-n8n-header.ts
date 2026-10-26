/** Cria uma credencial httpHeaderAuth com X-N8N-API-KEY (para o HTTP Request publicar fluxos). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv, obrigatorio } from './lib/env.ts';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(__dirname, '..', '.env');
const MAPA = path.join(__dirname, '.credenciais.json');

const apiKey = obrigatorio(lerEnv(ENV), 'N8N_API_KEY');
const cliente = criarCliente();
const mapa = fs.existsSync(MAPA) ? JSON.parse(fs.readFileSync(MAPA, 'utf8')) : {};

if (mapa.n8nApiHeader) {
  console.log(`n8nApiHeader já existe: ${mapa.n8nApiHeader.id}`);
  process.exit(0);
}

try {
  const r = await cliente.request<{ id: string }>('/credentials', {
    method: 'POST',
    body: JSON.stringify({ name: 'n8n API Header', type: 'httpHeaderAuth', data: { name: 'X-N8N-API-KEY', value: apiKey } }),
  });
  mapa.n8nApiHeader = { id: r.id, name: 'n8n API Header' };
  fs.writeFileSync(MAPA, JSON.stringify(mapa, null, 2) + '\n');
  console.log(`OK n8nApiHeader -> ${r.id}`);
} catch (e) {
  console.error('Falha:', (e as Error).message);
  process.exit(1);
}
