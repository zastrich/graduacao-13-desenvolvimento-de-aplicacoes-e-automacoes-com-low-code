/** Mostra o JSON de saída do último nó de uma execução. Uso: tsx dados-execucao.ts <execId> */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
if (!id) { console.error('Uso: tsx dados-execucao.ts <execId>'); process.exit(1); }

const cliente = criarCliente();
const e = (await cliente.request(`/executions/${id}?includeData=true`)) as {
  data?: { resultData?: { lastNodeExecuted?: string; runData?: Record<string, Array<{ data?: { main?: Array<Array<{ json?: unknown }>> } }>> } };
};
const rd = e.data?.resultData;
const ultimo = rd?.lastNodeExecuted;
console.log('último nó:', ultimo);
if (ultimo && rd?.runData?.[ultimo]) {
  const saida = rd.runData[ultimo][0]?.data?.main?.[0]?.[0]?.json;
  console.log(JSON.stringify(saida, null, 2).slice(0, 600));
}
