/** Consulta os tipos de nó instalados via endpoint interno do n8n. Uso: tsx ver-tipo-no.ts <filtro> */
import { lerEnv } from './lib/env.ts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = lerEnv(path.resolve(__dirname, '..', '.env'));
const base = (env.N8N_URL ?? 'http://localhost:5678').replace(/\/+$/, '');
const filtro = (process.argv[2] ?? 'googleSheets').toLowerCase();

// endpoint interno (não public API) — tenta sem auth (instância local)
const resp = await fetch(`${base}/types/nodes.json`);
if (!resp.ok) {
  console.error('HTTP', resp.status);
  process.exit(1);
}
const todos = (await resp.json()) as Array<{ name: string; version: number | number[]; displayName: string }>;
const achados = todos.filter((n) => n.name.toLowerCase().includes(filtro));
for (const n of achados) {
  console.log(`${n.name} | ${n.displayName} | version=${JSON.stringify(n.version)}`);
}
