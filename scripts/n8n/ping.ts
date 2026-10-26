/**
 * Testa a conexão com a instância local do n8n via Public API.
 * Lê scripts/.env (N8N_URL, N8N_API_KEY) e lista os workflows.
 */
import { criarCliente, ErroApi } from './lib/api.ts';

async function main(): Promise<void> {
  let cliente;
  try {
    cliente = criarCliente();
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }

  try {
    const r = await cliente.listarWorkflows();
    const total = r.data?.length ?? 0;
    console.log(`Conexão OK. Workflows na instância: ${total}.`);
    for (const w of r.data ?? []) {
      console.log(`  - [${w.id}] ${w.name}${w.active ? ' (publicado)' : ''}`);
    }
  } catch (e) {
    if (e instanceof ErroApi) {
      console.error(`Falha na API (HTTP ${e.status}): ${e.message}`);
    } else {
      console.error(`Falha ao conectar: ${(e as Error).message}`);
    }
    process.exit(1);
  }
}

main();
