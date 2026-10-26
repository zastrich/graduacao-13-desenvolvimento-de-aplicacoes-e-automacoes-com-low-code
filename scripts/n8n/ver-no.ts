/** Mostra a definição de um nó do workflow. Uso: tsx ver-no.ts <workflowId> <nomeNo> */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
const nome = process.argv[3];
const cliente = criarCliente();
const wf = (await cliente.obterWorkflow(id)) as {
  nodes: Array<Record<string, unknown>>;
  connections: Record<string, unknown>;
};
if (nome) {
  const n = wf.nodes.find((x) => x.name === nome);
  console.log(JSON.stringify(n, null, 2));
} else {
  console.log('NÓS:');
  for (const n of wf.nodes) console.log(`- ${n.name} [${n.type}] id=${n.id}`);
  console.log('\nCONEXÕES:');
  console.log(JSON.stringify(wf.connections, null, 2));
}
