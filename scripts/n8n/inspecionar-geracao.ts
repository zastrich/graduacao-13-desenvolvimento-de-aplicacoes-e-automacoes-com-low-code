/** Dispara o dry-run do Núcleo e salva o workflow gerado para inspeção.
 * Uso: tsx inspecionar-geracao.ts <pedido> [saida.json] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv, obrigatorio } from './lib/env.ts';
import { carregarConfig } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..', '..');
const ENV = path.resolve(__dirname, '..', '.env');
const EXEMPLOS = path.join(RAIZ, 'n8n', 'exemplos');

const nome = process.argv[2];
if (!nome) { console.error('Uso: tsx inspecionar-geracao.ts <pedido> [saida.json]'); process.exit(1); }
const saida = process.argv[3];

const env = lerEnv(ENV);
const { baseUrl } = carregarConfig(env);
const token = obrigatorio(env, 'DRY_RUN_TOKEN');
const pedido = JSON.parse(fs.readFileSync(path.join(EXEMPLOS, `${nome}.json`), 'utf8'));

const ac = new AbortController();
const to = setTimeout(() => ac.abort(), 120000);
try {
  const r = await fetch(`${baseUrl.replace(/\/+$/, '')}/webhook/meta-gerador-dry-run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Dry-Run-Token': token },
    body: JSON.stringify(pedido),
    signal: ac.signal,
  });
  const resp = (await r.json()) as { ok?: boolean; workflow?: { nodes: Array<{ name: string; type: string }>; connections: Record<string, unknown> }; erros?: string[] };
  if (!resp.ok || !resp.workflow) {
    console.log('Falha:', resp.erros ?? resp);
    process.exit(1);
  }
  const wf = resp.workflow;
  console.log(`Nós (${wf.nodes.length}):`);
  for (const n of wf.nodes) console.log(`  - ${n.name} [${n.type}]`);
  console.log('\nConexões:');
  for (const [origem, portas] of Object.entries(wf.connections)) {
    for (const [tipo, saidas] of Object.entries(portas as Record<string, Array<Array<{ node: string }>>>)) {
      for (const porta of saidas) for (const alvo of porta) console.log(`  ${origem} --(${tipo})--> ${alvo.node}`);
    }
  }
  if (saida) { fs.writeFileSync(saida, JSON.stringify(wf, null, 2)); console.log(`\nSalvo em ${saida}`); }
} finally {
  clearTimeout(to);
}
