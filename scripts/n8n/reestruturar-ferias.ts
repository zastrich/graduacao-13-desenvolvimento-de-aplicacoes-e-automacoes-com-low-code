/**
 * Insere um nó "Calcular Regras" (determinístico) no fluxo de férias e reconecta:
 *   Base (CSV) -> Calcular Regras -> Avaliar (IA redige) -> Ler Resposta -> Decidir
 * A IA passa a receber o resultado do cálculo e só redige a decisão final.
 * Uso: tsx reestruturar-ferias.ts <workflowId>
 */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
if (!id) { console.error('Uso: tsx reestruturar-ferias.ts <workflowId>'); process.exit(1); }

const JS_CALCULAR = `// Calcula as regras de férias de forma determinística (sem IA).
const form = $('Formulário de Férias').first().json;
const base = $('Base (CSV)').first().json;

const matricula = String(form['Matrícula'] ?? form.matricula ?? '').trim();
const inicioStr = form['Data de Início'] ?? form.inicio;
const fimStr = form['Data de Fim'] ?? form.fim;
const venderStr = String(form['Vender Parte das Férias'] ?? '').toLowerCase();
const vender = venderStr.startsWith('s') || venderStr === 'sim' || venderStr === 'true';

const colaborador = (base.colaboradores || []).find(c => String(c.matricula) === matricula) || null;
const historico = (base.ferias || []).filter(f => String(f.matricula) === matricula);

const hoje = new Date();
const inicio = new Date(inicioStr);
const fim = new Date(fimStr);
const MS_DIA = 24 * 60 * 60 * 1000;

const violacoes = [];
if (!colaborador) violacoes.push('Colaborador com matrícula ' + matricula + ' não encontrado na base.');
if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) violacoes.push('Datas inválidas.');

let dias = 0, antecedencia = 0, intervaloDias = null;
if (!isNaN(inicio.getTime()) && !isNaN(fim.getTime())) {
  dias = Math.round((fim - inicio) / MS_DIA) + 1;
  antecedencia = Math.round((inicio - hoje) / MS_DIA);
  if (fim < inicio) violacoes.push('A data de fim é anterior à data de início.');
  if (antecedencia < 30) violacoes.push('Antecedência de ' + antecedencia + ' dias é menor que o mínimo de 30 dias.');
  if (dias < 5) violacoes.push('Período de ' + dias + ' dias é menor que o mínimo de 5 dias.');
  if (colaborador && dias > Number(colaborador.saldoDias)) violacoes.push('Período de ' + dias + ' dias excede o saldo de ' + colaborador.saldoDias + ' dias.');
}
if (colaborador && historico.length > 0) {
  const ultimoFim = historico.map(f => new Date(f.fim)).sort((a,b) => b - a)[0];
  intervaloDias = Math.round((inicio - ultimoFim) / MS_DIA);
}

const aprovadoRegras = violacoes.length === 0;
return [{ json: {
  matricula, inicio: inicioStr, fim: fimStr, dias, antecedencia, vender,
  intervaloDesdeUltimasFeriasDias: intervaloDias,
  saldoDias: colaborador ? colaborador.saldoDias : null,
  colaborador, aprovadoRegras, violacoes,
} }];`;

const PROMPT_AVALIAR = `=Você é um assistente de RH. A validação das regras JÁ FOI FEITA por um sistema determinístico; NÃO recalcule nada.

Resultado do cálculo das regras:
{{ JSON.stringify($json) }}

Responda ESTRITAMENTE em JSON no formato {"aprovado": true|false, "motivo": "texto claro e cordial"}.
Use exatamente aprovado = {{ $json.aprovadoRegras }}. No motivo, explique de forma amigável ao colaborador: se aprovado, confirme o período; se reprovado, liste as violações informadas. Não invente regras nem números.`;

const cliente = criarCliente();
const wf = (await cliente.obterWorkflow(id)) as {
  name: string;
  nodes: Array<Record<string, unknown>>;
  connections: Record<string, Record<string, unknown>>;
  settings: unknown;
};

// Evita duplicar
if (wf.nodes.some((n) => n.name === 'Calcular Regras')) {
  console.log('Nó "Calcular Regras" já existe.');
} else {
  const avaliar = wf.nodes.find((n) => n.name === 'Avaliar')!;
  const posAval = (avaliar.position as [number, number]) || [0, 0];
  wf.nodes.push({
    parameters: { mode: 'runOnceForAllItems', jsCode: JS_CALCULAR },
    id: 'ferias-calcular',
    name: 'Calcular Regras',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [posAval[0] - 220, posAval[1]],
  });
  // Reconecta Base (CSV) -> Calcular Regras -> Avaliar
  wf.connections['Base (CSV)'] = { main: [[{ node: 'Calcular Regras', type: 'main', index: 0 }]] };
  wf.connections['Calcular Regras'] = { main: [[{ node: 'Avaliar', type: 'main', index: 0 }]] };
}

// Atualiza o prompt do Avaliar para usar o cálculo
const avaliar = wf.nodes.find((n) => n.name === 'Avaliar')!;
avaliar.parameters = { ...(avaliar.parameters as object), promptType: 'define', text: PROMPT_AVALIAR };

await cliente.request(`/workflows/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }),
});
console.log(`Fluxo ${id} reestruturado com nó de cálculo determinístico.`);
