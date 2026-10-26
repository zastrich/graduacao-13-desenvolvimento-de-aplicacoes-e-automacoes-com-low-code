/** Lista execuções recentes de um workflow (todas as situações). Uso: tsx listar-execucoes.ts <id> [limit] */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
const limit = Number(process.argv[3] ?? 5);
if (!id) {
  console.error('Uso: tsx listar-execucoes.ts <workflowId> [limit]');
  process.exit(1);
}
const cliente = criarCliente();
const r = await cliente.request<{ data: Array<{ id: string; status: string; finished: boolean; mode: string; startedAt: string; stoppedAt: string }> }>(
  `/executions?workflowId=${id}&limit=${limit}`,
);
if (!r.data || r.data.length === 0) {
  console.log('Nenhuma execução.');
} else {
  for (const e of r.data) {
    console.log(`[${e.id}] status=${e.status} finished=${e.finished} mode=${e.mode} em=${e.startedAt}`);
  }
}
