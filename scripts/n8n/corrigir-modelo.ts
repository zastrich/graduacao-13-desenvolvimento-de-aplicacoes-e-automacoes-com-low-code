/** Corrige o parâmetro model (resource locator) do nó OpenAI num workflow. Uso: tsx corrigir-modelo.ts <id> */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
if (!id) { console.error('Uso: tsx corrigir-modelo.ts <workflowId>'); process.exit(1); }

const cliente = criarCliente();
const wf = (await cliente.obterWorkflow(id)) as { name: string; nodes: Array<Record<string, unknown>>; connections: unknown; settings: unknown };

let mudou = 0;
for (const n of wf.nodes) {
  if (/lmChatOpenAi$/i.test(n.type as string)) {
    const p = (n.parameters ?? {}) as { model?: unknown };
    if (typeof p.model === 'string' || !p.model || typeof p.model !== 'object') {
      const valor = typeof p.model === 'string' ? p.model : 'gpt-4o-mini';
      p.model = { __rl: true, mode: 'list', value: valor };
      n.parameters = p;
      mudou++;
    }
  }
}

if (mudou === 0) { console.log('Nada a corrigir.'); process.exit(0); }

await cliente.request(`/workflows/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }),
});
console.log(`Corrigido ${mudou} nó(s) OpenAI em ${id}.`);
