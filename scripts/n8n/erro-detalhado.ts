/** Mostra o erro detalhado de um nó numa execução. Uso: tsx erro-detalhado.ts <execId> */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
const cliente = criarCliente();
const e = (await cliente.request(`/executions/${id}?includeData=true`)) as {
  data?: { resultData?: { error?: unknown; runData?: Record<string, unknown[]> } };
};
const rd = e.data?.resultData;
console.log('erro top:', JSON.stringify(rd?.error, null, 2)?.slice(0, 500));
// procura erro nos nós
for (const [nome, runs] of Object.entries(rd?.runData ?? {})) {
  for (const run of runs as Array<{ error?: { message?: string; description?: string } }>) {
    if (run?.error) {
      console.log(`\nnó "${nome}":`, run.error.message, '|', run.error.description ?? '');
    }
  }
}
