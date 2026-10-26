/**
 * Enriquece a "Página de Aprovação do Gestor" com o resumo da solicitação
 * (colaborador, matrícula, período, dias, saldo e avaliação da IA), para que
 * o gestor decida com contexto. As informações entram no formDescription via
 * expressões que leem $('Calcular Regras') e $('Ler Resposta').
 *
 * Uso: tsx detalhar-pagina-gestor.ts <workflowId>
 */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
if (!id) { console.error('Uso: tsx detalhar-pagina-gestor.ts <workflowId>'); process.exit(1); }

// Nós Form intermediários (não-trigger) herdam título/descrição do Form Trigger
// e ignoram formTitle/formDescription próprios. Para exibir o resumo da
// solicitação, usamos um campo do tipo "html" no topo do formulário, cujo
// conteúdo é resolvido por expressão a partir de Calcular Regras / Ler Resposta.
const HTML_RESUMO =
  `=<h2>Aprovação de Férias — Gestor</h2>` +
  `<p><b>Colaborador:</b> {{ $('Calcular Regras').first().json.colaborador.nome }} ` +
  `(matrícula {{ $('Calcular Regras').first().json.matricula }})</p>` +
  `<p><b>Período solicitado:</b> {{ $('Calcular Regras').first().json.inicio }} a ` +
  `{{ $('Calcular Regras').first().json.fim }} ` +
  `({{ $('Calcular Regras').first().json.dias }} dias)</p>` +
  `<p><b>Saldo de dias:</b> {{ $('Calcular Regras').first().json.saldoDias }}</p>` +
  `<p><b>Gestor responsável:</b> {{ $('Calcular Regras').first().json.colaborador.gestor }}</p>` +
  `<p><b>Avaliação automática:</b> {{ $('Ler Resposta').first().json.motivo }}</p>`;

const cliente = criarCliente();
const wf = (await cliente.obterWorkflow(id)) as {
  name: string; nodes: Array<Record<string, unknown>>; connections: Record<string, Record<string, unknown>>; settings: unknown;
};

const pag = wf.nodes.find((n) => n.name === 'Página de Aprovação do Gestor');
if (!pag) { console.error('Nó "Página de Aprovação do Gestor" não encontrado.'); process.exit(1); }

pag.parameters = {
  formTitle: 'Aprovação de Férias — Gestor',
  formDescription: 'Analise os dados abaixo e decida.',
  formFields: {
    values: [
      { fieldLabel: 'Resumo', fieldType: 'html', html: HTML_RESUMO },
      {
        fieldLabel: 'Decisão',
        fieldType: 'radio',
        requiredField: true,
        fieldOptions: { values: [{ option: 'Aprovar' }, { option: 'Reprovar' }] },
      },
      { fieldLabel: 'Motivo da reprovação', fieldType: 'textarea', requiredField: false },
    ],
  },
  options: {},
};

await cliente.request(`/workflows/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }),
});
console.log(`Fluxo ${id}: página do gestor agora exibe colaborador e período.`);
