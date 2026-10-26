/** Ativa (publica) um workflow pela Public API. Uso: tsx ativar-workflow.ts <id> [off] */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
const desativar = process.argv[3] === 'off';
if (!id) {
  console.error('Uso: tsx ativar-workflow.ts <id> [off]');
  process.exit(1);
}

const cliente = criarCliente();
const acao = desativar ? 'deactivate' : 'activate';
try {
  await cliente.request(`/workflows/${id}/${acao}`, { method: 'POST' });
  console.log(`${acao} OK: ${id}`);
} catch (e) {
  console.error(`Falha em ${acao}:`, (e as Error).message);
  const corpo = (e as { corpo?: string }).corpo;
  if (corpo) console.error(corpo.slice(0, 300));
  process.exit(1);
}
