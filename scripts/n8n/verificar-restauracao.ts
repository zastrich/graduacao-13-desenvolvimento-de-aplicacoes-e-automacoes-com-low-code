/**
 * Verifica que os JSONs exportados são restauráveis e íntegros:
 *  - cada arquivo do manifesto existe e tem name/nodes/connections/settings;
 *  - o id do arquivo bate com o manifesto (import via CLI preserva o id);
 *  - os nós e conexões do arquivo batem com o que está na instância (via API).
 *
 * Não altera a base. É a checagem de reprodutibilidade da Task 11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..', '..');
const WORKFLOWS_DIR = path.join(RAIZ, 'n8n', 'workflows');
const MANIFESTO = path.join(WORKFLOWS_DIR, 'manifesto.json');

interface Wf { id?: string; name?: string; nodes?: unknown[]; connections?: Record<string, unknown>; settings?: unknown; }

async function main(): Promise<void> {
  const manifesto: Array<{ id: string; arquivo: string }> = JSON.parse(fs.readFileSync(MANIFESTO, 'utf8'));
  const cliente = criarCliente();
  let falhas = 0;

  for (const item of manifesto) {
    const caminho = path.join(WORKFLOWS_DIR, item.arquivo);
    if (!fs.existsSync(caminho)) {
      console.log(`✗ ${item.arquivo}: arquivo não existe`);
      falhas++;
      continue;
    }
    const wf = JSON.parse(fs.readFileSync(caminho, 'utf8')) as Wf;
    const problemas: string[] = [];
    if (!wf.name) problemas.push('sem name');
    if (!Array.isArray(wf.nodes) || wf.nodes.length === 0) problemas.push('sem nodes');
    if (!wf.connections) problemas.push('sem connections');
    if (!wf.settings) problemas.push('sem settings');
    if (wf.id !== item.id) problemas.push(`id (${wf.id}) != manifesto (${item.id})`);

    // Compara com a instância
    try {
      const naInstancia = (await cliente.obterWorkflow(item.id)) as Wf;
      const nomesArq = (wf.nodes ?? []).map((n) => (n as { name: string }).name).sort();
      const nomesInst = (naInstancia.nodes ?? []).map((n) => (n as { name: string }).name).sort();
      if (JSON.stringify(nomesArq) !== JSON.stringify(nomesInst)) {
        problemas.push('nós divergem da instância');
      }
      const conArq = Object.keys(wf.connections ?? {}).sort();
      const conInst = Object.keys(naInstancia.connections ?? {}).sort();
      if (JSON.stringify(conArq) !== JSON.stringify(conInst)) {
        problemas.push('conexões divergem da instância');
      }
    } catch (e) {
      problemas.push(`não encontrado na instância: ${(e as Error).message}`);
    }

    if (problemas.length === 0) {
      console.log(`✓ ${item.arquivo}: íntegro (${(wf.nodes ?? []).length} nós, id ${wf.id})`);
    } else {
      console.log(`✗ ${item.arquivo}: ${problemas.join('; ')}`);
      falhas++;
    }
  }

  console.log('');
  if (falhas === 0) {
    console.log('Restauração verificada: todos os workflows são íntegros e reproduzíveis.');
    console.log('Para restaurar numa base vazia: subir a instância, criar o owner, e rodar `npm run n8n:import`.');
  } else {
    console.log(`${falhas} problema(s) encontrado(s).`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Erro:', (e as Error).message);
  process.exit(1);
});
