/**
 * Insere, no caminho de APROVAÇÃO do gestor, um nó Google Sheets que grava a
 * concessão das férias na aba "ferias" da planilha (append de uma linha).
 *
 * Novo trecho:
 *   Decisão do Gestor [Aprovar] -> Registrar Férias na Planilha (Sheets append)
 *                               -> Registrar Conclusão (e-mail ao colaborador)
 *
 * A linha gravada usa os dados de $('Calcular Regras'): matricula, inicio, fim, dias.
 *
 * Uso: tsx registrar-ferias-planilha.ts <workflowId>
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const id = process.argv[2];
if (!id) { console.error('Uso: tsx registrar-ferias-planilha.ts <workflowId>'); process.exit(1); }

const creds = JSON.parse(readFileSync(path.join(__dirname, '.credenciais.json'), 'utf8')) as Record<string, { id: string; name: string; abas?: string[] }>;
const credSheets = creds.googleSheetsOAuth2Api;
const planilha = creds._planilhaFerias;
if (!credSheets?.id) { console.error('Credencial googleSheetsOAuth2Api ausente.'); process.exit(1); }
const planilhaId = planilha.id;

const cliente = criarCliente();
const wf = (await cliente.obterWorkflow(id)) as {
  name: string; nodes: Array<Record<string, unknown>>; connections: Record<string, Record<string, unknown>>; settings: unknown;
};
const porNome = (n: string) => wf.nodes.find((x) => x.name === n);

// Idempotência
wf.nodes = wf.nodes.filter((n) => n.name !== 'Registrar Férias na Planilha');

const decisao = porNome('Decisão do Gestor')!;
const posDec = (decisao.position as [number, number]) || [1788, 304];

const noAppend = {
  parameters: {
    operation: 'append',
    documentId: { __rl: true, mode: 'id', value: planilhaId },
    sheetName: { __rl: true, mode: 'name', value: 'ferias' },
    columns: {
      mappingMode: 'defineBelow',
      value: {
        matricula: "={{ $('Calcular Regras').first().json.matricula }}",
        inicio: "={{ $('Calcular Regras').first().json.inicio }}",
        fim: "={{ $('Calcular Regras').first().json.fim }}",
        dias: "={{ $('Calcular Regras').first().json.dias }}",
      },
      matchingColumns: [],
      schema: [
        { id: 'matricula', displayName: 'matricula', required: false, display: true, type: 'string', canBeUsedToMatch: true },
        { id: 'inicio', displayName: 'inicio', required: false, display: true, type: 'string', canBeUsedToMatch: true },
        { id: 'fim', displayName: 'fim', required: false, display: true, type: 'string', canBeUsedToMatch: true },
        { id: 'dias', displayName: 'dias', required: false, display: true, type: 'string', canBeUsedToMatch: true },
      ],
    },
    options: {},
  },
  id: 'ferias-append-planilha',
  name: 'Registrar Férias na Planilha',
  type: 'n8n-nodes-base.googleSheets',
  typeVersion: 4.5,
  position: [posDec[0] + 200, posDec[1] - 40],
  credentials: { googleSheetsOAuth2Api: { id: credSheets.id, name: credSheets.name } },
};

wf.nodes.push(noAppend);

// Reconecta: Decisão do Gestor [Aprovar=main[0]] -> Registrar Férias na Planilha -> Registrar Conclusão
const conDecisao = wf.connections['Decisão do Gestor'] as { main: unknown[][] };
const falso = conDecisao?.main?.[1] ?? [{ node: 'E-mail Reprovação Gestor', type: 'main', index: 0 }];
wf.connections['Decisão do Gestor'] = {
  main: [
    [{ node: 'Registrar Férias na Planilha', type: 'main', index: 0 }],
    falso as never,
  ],
};
wf.connections['Registrar Férias na Planilha'] = {
  main: [[{ node: 'Registrar Conclusão', type: 'main', index: 0 }]],
};

await cliente.request(`/workflows/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }),
});
console.log(`Fluxo ${id}: aprovação do gestor agora grava as férias na aba "ferias" da planilha.`);
