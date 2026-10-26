/** Remove workflows de spike auxiliares (sub e chamador) por ID. */
import { criarCliente } from './lib/api.ts';

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('Uso: tsx spike-limpar.ts <id> [id...]');
  process.exit(1);
}

const cliente = criarCliente();
for (const id of ids) {
  try {
    await cliente.request(`/workflows/${id}`, { method: 'DELETE' });
    console.log(`Removido: ${id}`);
  } catch (e) {
    console.error(`Falha ao remover ${id}: ${(e as Error).message}`);
  }
}
