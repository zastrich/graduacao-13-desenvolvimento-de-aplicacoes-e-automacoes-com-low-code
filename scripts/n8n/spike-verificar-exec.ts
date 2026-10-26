import { criarCliente } from './lib/api.ts';

const workflowId = process.argv[2];
if (!workflowId) {
  console.error('Uso: tsx spike-verificar-exec.ts <workflowId>');
  process.exit(1);
}

const cliente = criarCliente();
const r = await cliente.request<{ data: Array<{ id: string; status: string; finished: boolean; mode: string }> }>(
  `/executions?workflowId=${workflowId}&limit=1`,
);
const e = r.data?.[0];
if (!e) {
  console.log('Nenhuma execução encontrada.');
} else {
  console.log(`status: ${e.status} | finished: ${e.finished} | mode: ${e.mode} | id: ${e.id}`);
}
