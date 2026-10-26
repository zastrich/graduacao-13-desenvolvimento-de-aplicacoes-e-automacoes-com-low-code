/** Mostra a saída de um nó específico numa execução. Uso: tsx ver-saida-no.ts <execId> <nomeNo> */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
const nomeNo = process.argv[3];
const cliente = criarCliente();
const e = (await cliente.request(`/executions/${id}?includeData=true`)) as {
  data?: { resultData?: { runData?: Record<string, Array<{ data?: { main?: Array<Array<{ json?: unknown }>> } }>> } };
};
const runs = e.data?.resultData?.runData?.[nomeNo];
if (!runs) { console.log(`Sem dados para "${nomeNo}"`); process.exit(0); }
const saida = runs[0]?.data?.main?.[0]?.[0]?.json;
console.log(JSON.stringify(saida, null, 2).slice(0, 800));
