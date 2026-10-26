/**
 * Exporta os workflows do manifesto via Public API (GET /workflows/{id}),
 * normalizando para um JSON importável e versionável. Mais robusto que o CLI
 * com o servidor em execução (o CLI pode travar por lock do SQLite).
 *
 * Remove campos voláteis (pinData, versionId, meta, datas, ids de execução)
 * mas PRESERVA o id do workflow e os ids dos nós (import mantém referências).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..', '..');
const WORKFLOWS_DIR = path.join(RAIZ, 'n8n', 'workflows');
const MANIFESTO = path.join(WORKFLOWS_DIR, 'manifesto.json');

interface ItemManifesto { id: string; arquivo: string; }

function limpar(wf: Record<string, unknown>): Record<string, unknown> {
  const {
    // descartados
    shared, triggerCount, versionId, meta, pinData, createdAt, updatedAt,
    // preservados
    id, name, nodes, connections, settings, staticData, active,
    ...resto
  } = wf as Record<string, unknown>;
  void shared; void triggerCount; void versionId; void meta; void pinData;
  void createdAt; void updatedAt; void resto;
  return {
    id,
    name,
    nodes,
    connections,
    settings: settings ?? { executionOrder: 'v1' },
    active: active ?? false,
    staticData: staticData ?? null,
  };
}

async function main(): Promise<void> {
  if (!fs.existsSync(MANIFESTO)) {
    console.error('Manifesto não encontrado.');
    process.exit(1);
  }
  const manifesto: ItemManifesto[] = JSON.parse(fs.readFileSync(MANIFESTO, 'utf8'));
  if (manifesto.length === 0) {
    console.log('Manifesto vazio.');
    return;
  }
  const cliente = criarCliente();
  for (const item of manifesto) {
    const wf = (await cliente.obterWorkflow(item.id)) as Record<string, unknown>;
    const limpo = limpar(wf);
    const destino = path.join(WORKFLOWS_DIR, item.arquivo);
    fs.writeFileSync(destino, JSON.stringify(limpo, null, 2) + '\n');
    console.log(`Exportado: ${item.arquivo} (id ${item.id})`);
  }
  console.log(`${manifesto.length} workflow(s) exportado(s) via API.`);
}

main().catch((e) => {
  console.error('Falha no export:', (e as Error).message);
  process.exit(1);
});
