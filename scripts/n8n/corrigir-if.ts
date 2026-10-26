/** Normaliza conexões de nós If (porta false -> main[1]). Uso: tsx corrigir-if.ts <id> */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
if (!id) { console.error('Uso: tsx corrigir-if.ts <workflowId>'); process.exit(1); }

const cliente = criarCliente();
const wf = (await cliente.obterWorkflow(id)) as { name: string; nodes: Array<Record<string, unknown>>; connections: Record<string, Record<string, unknown>>; settings: unknown };

const tipos = new Map(wf.nodes.map((n) => [n.name as string, n.type as string]));
let mudou = 0;
for (const origem of Object.keys(wf.connections)) {
  if (!/\.if$/i.test(tipos.get(origem) ?? '')) continue;
  const portas = wf.connections[origem];
  const main = (Array.isArray(portas.main) ? portas.main : []) as unknown[];
  const mainNorm: unknown[] = [main[0] ?? [], main[1] ?? []];
  if (Array.isArray(portas.true)) { mainNorm[0] = (portas.true as unknown[])[0] ?? mainNorm[0]; delete portas.true; mudou++; }
  if (Array.isArray(portas.false)) { mainNorm[1] = (portas.false as unknown[])[0] ?? mainNorm[1]; delete portas.false; mudou++; }
  portas.main = mainNorm;
}

if (mudou === 0) { console.log('Nada a corrigir.'); process.exit(0); }
await cliente.request(`/workflows/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }),
});
console.log(`Conexões de If normalizadas em ${id}.`);
