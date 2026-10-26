/** Corrige o prompt do nó Avaliar para incluir os dados reais. Uso: tsx corrigir-avaliar.ts <id> */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
if (!id) { console.error('Uso: tsx corrigir-avaliar.ts <workflowId>'); process.exit(1); }

const PROMPT = `=Você é um avaliador de solicitações de férias. Responda ESTRITAMENTE em JSON no formato {"aprovado": true|false, "motivo": "texto"} e nada mais.

Políticas: (1) datas coerentes (fim depois do início); (2) antecedência mínima de 30 dias entre hoje e o início; (3) mínimo de 5 dias corridos; (4) não exceder o saldoDias do colaborador; (5) respeitar intervalo razoável desde as últimas férias.

Solicitação do colaborador:
{{ JSON.stringify($('Formulário de Férias').item.json) }}

Base de dados (colaboradores e férias):
{{ JSON.stringify($('Base (CSV)').item.json) }}

Avalie agora e responda apenas o JSON.`;

const cliente = criarCliente();
const wf = (await cliente.obterWorkflow(id)) as { name: string; nodes: Array<Record<string, unknown>>; connections: unknown; settings: unknown };
const no = wf.nodes.find((n) => n.name === 'Avaliar');
if (!no) { console.error('Nó "Avaliar" não encontrado.'); process.exit(1); }
no.parameters = { ...(no.parameters as object), promptType: 'define', text: PROMPT };

await cliente.request(`/workflows/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }),
});
console.log(`Prompt do "Avaliar" corrigido em ${id}.`);
