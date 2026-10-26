/** Mostra o erro de uma execução. Uso: tsx detalhe-execucao.ts <execId> */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
if (!id) {
  console.error('Uso: tsx detalhe-execucao.ts <execId>');
  process.exit(1);
}
const cliente = criarCliente();
const e = (await cliente.request(`/executions/${id}?includeData=true`)) as {
  status: string;
  data?: { resultData?: { error?: { message?: string; node?: { name?: string } }; lastNodeExecuted?: string } };
};
console.log('status:', e.status);
const rd = e.data?.resultData;
console.log('último nó executado:', rd?.lastNodeExecuted);
if (rd?.error) {
  console.log('nó com erro:', rd.error.node?.name);
  console.log('mensagem:', rd.error.message);
}
