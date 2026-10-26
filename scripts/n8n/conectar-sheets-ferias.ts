/**
 * Substitui o nó "Base (CSV)" (dados hardcoded) do fluxo de férias por leitura
 * real da planilha Google Sheets.
 *
 * Nova cadeia:
 *   Formulário de Férias
 *     -> Ler Colaboradores (Google Sheets, aba "colaboradores")
 *     -> Ler Férias        (Google Sheets, aba "ferias")
 *     -> Montar Base       (Code: agrega as duas abas em { colaboradores, ferias })
 *     -> Calcular Regras   (inalterado — lê $('Montar Base'))
 *
 * O nó "Calcular Regras" original lê $('Base (CSV)'); por isso o nó agregador
 * recebe o nome "Base (CSV)" para preservar essa referência sem editar o Code.
 *
 * Uso: tsx conectar-sheets-ferias.ts <workflowId>
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const id = process.argv[2];
if (!id) {
  console.error('Uso: tsx conectar-sheets-ferias.ts <workflowId>');
  process.exit(1);
}

const creds = JSON.parse(
  readFileSync(path.join(__dirname, '.credenciais.json'), 'utf8'),
) as Record<string, { id: string; name: string; abas?: string[] }>;

const credSheets = creds.googleSheetsOAuth2Api;
const planilha = creds._planilhaFerias;
if (!credSheets?.id) {
  console.error('Credencial googleSheetsOAuth2Api não encontrada em .credenciais.json');
  process.exit(1);
}
const planilhaId = planilha.id;

function noSheets(nome: string, aba: string, pos: [number, number]) {
  return {
    parameters: {
      documentId: { __rl: true, mode: 'id', value: planilhaId },
      sheetName: { __rl: true, mode: 'name', value: aba },
      options: {},
    },
    id: `ferias-sheets-${aba}`,
    name: nome,
    type: 'n8n-nodes-base.googleSheets',
    typeVersion: 4.5,
    position: pos,
    credentials: {
      googleSheetsOAuth2Api: { id: credSheets.id, name: credSheets.name },
    },
  };
}

// Code agregador: lê as duas leituras e monta { colaboradores, ferias }.
// Normaliza saldoDias/dias para número.
const JS_MONTAR = `const colaboradores = $('Ler Colaboradores').all().map(i => ({
  matricula: String(i.json.matricula ?? '').trim(),
  nome: i.json.nome,
  email: i.json.email,
  gestor: i.json.gestor,
  emailGestor: i.json.emailGestor,
  dataAdmissao: i.json.dataAdmissao,
  saldoDias: Number(i.json.saldoDias),
}));
const ferias = $('Ler Férias').all().map(i => ({
  matricula: String(i.json.matricula ?? '').trim(),
  inicio: i.json.inicio,
  fim: i.json.fim,
  dias: Number(i.json.dias),
}));
return [{ json: { colaboradores, ferias } }];`;

const cliente = criarCliente();
const wf = (await cliente.obterWorkflow(id)) as {
  name: string;
  nodes: Array<Record<string, unknown>>;
  connections: Record<string, Record<string, unknown>>;
  settings: unknown;
};

const baseAntigo = wf.nodes.find((n) => n.name === 'Base (CSV)');
if (!baseAntigo) {
  console.error('Nó "Base (CSV)" não encontrado — nada a fazer.');
  process.exit(1);
}
const posBase = (baseAntigo.position as [number, number]) || [64, 304];

// Remove o nó antigo "Base (CSV)" e qualquer nó Sheets/Montar já existente (idempotente)
const removerNomes = new Set(['Base (CSV)', 'Ler Colaboradores', 'Ler Férias']);
wf.nodes = wf.nodes.filter((n) => !removerNomes.has(n.name as string));

// Cria os nós novos
const lerColab = noSheets('Ler Colaboradores', 'colaboradores', [posBase[0] - 40, posBase[1] - 120]);
const lerFerias = noSheets('Ler Férias', 'ferias', [posBase[0] - 40, posBase[1] + 120]);
const montarBase = {
  parameters: { mode: 'runOnceForAllItems', jsCode: JS_MONTAR },
  id: 'ferias-montar-base',
  name: 'Base (CSV)', // mantém o nome p/ preservar referência do "Calcular Regras"
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [posBase[0] + 180, posBase[1]],
};

wf.nodes.push(lerColab, lerFerias, montarBase);

// Reconecta: Formulário -> Ler Colaboradores -> Ler Férias -> Base (CSV) -> Calcular Regras
wf.connections['Formulário de Férias'] = {
  main: [[{ node: 'Ler Colaboradores', type: 'main', index: 0 }]],
};
wf.connections['Ler Colaboradores'] = {
  main: [[{ node: 'Ler Férias', type: 'main', index: 0 }]],
};
wf.connections['Ler Férias'] = {
  main: [[{ node: 'Base (CSV)', type: 'main', index: 0 }]],
};
wf.connections['Base (CSV)'] = {
  main: [[{ node: 'Calcular Regras', type: 'main', index: 0 }]],
};

await cliente.request(`/workflows/${id}`, {
  method: 'PUT',
  body: JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings,
  }),
});
console.log(`Fluxo ${id} agora lê a planilha Google Sheets (${planilhaId}).`);
console.log('Cadeia: Formulário -> Ler Colaboradores -> Ler Férias -> Base (CSV) [agrega] -> Calcular Regras');
