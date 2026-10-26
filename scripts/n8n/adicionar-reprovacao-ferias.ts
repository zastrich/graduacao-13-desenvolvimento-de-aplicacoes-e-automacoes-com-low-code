/**
 * Adiciona os caminhos de REPROVAÇÃO (com e-mail ao colaborador) ao fluxo de férias:
 *
 * 1) Reprovação automática (regras não atendidas) — porta "false" do nó "Decidir":
 *      Decidir[false] -> E-mail Reprovação Automática (Gmail) -> Página de Erro
 *
 * 2) Reprovação pelo gestor — a Página de Aprovação do Gestor ganha um radio
 *    "Decisão" (Aprovar/Reprovar) + um campo "Motivo da reprovação":
 *      Página de Aprovação do Gestor -> Decisão do Gestor (If)
 *        [Aprovar]  -> Registrar Conclusão (e-mail de aprovação, já existente)
 *        [Reprovar] -> E-mail Reprovação Gestor (Gmail) -> Página Reprovado (Form Ending)
 *
 * O motivo da reprovação:
 *   - automática: vem de $('Ler Resposta').motivo (texto redigido pela IA).
 *   - do gestor:  vem do campo "Motivo da reprovação" preenchido pelo gestor
 *                 (ou mensagem padrão se vazio).
 *
 * Uso: tsx adicionar-reprovacao-ferias.ts <workflowId>
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const id = process.argv[2];
if (!id) { console.error('Uso: tsx adicionar-reprovacao-ferias.ts <workflowId>'); process.exit(1); }

const creds = JSON.parse(readFileSync(path.join(__dirname, '.credenciais.json'), 'utf8')) as Record<string, { id: string; name: string }>;
const credGmail = creds.gmailOAuth2;
if (!credGmail?.id) { console.error('Credencial gmailOAuth2 ausente.'); process.exit(1); }

const credBlock = { gmailOAuth2: { id: credGmail.id, name: credGmail.name } };

// --- Corpos de e-mail ---
const CORPO_REPROVA_AUTO =
  `=Olá {{ $('Calcular Regras').first().json.colaborador.nome }},\n\n` +
  `Sua solicitação de férias foi REPROVADA pela avaliação automática.\n\n` +
  `Período solicitado: {{ $('Calcular Regras').first().json.inicio }} a {{ $('Calcular Regras').first().json.fim }}.\n\n` +
  `Motivo: {{ $('Ler Resposta').first().json.motivo }}\n\n` +
  `Se precisar, ajuste o pedido e solicite novamente.\n\n` +
  `-- Sistema de Férias (automação n8n)`;

const CORPO_REPROVA_GESTOR =
  `=Olá {{ $('Calcular Regras').first().json.colaborador.nome }},\n\n` +
  `Sua solicitação de férias foi REPROVADA pelo gestor ` +
  `{{ $('Calcular Regras').first().json.colaborador.gestor }}.\n\n` +
  `Período solicitado: {{ $('Calcular Regras').first().json.inicio }} a {{ $('Calcular Regras').first().json.fim }}.\n\n` +
  `Motivo informado: {{ $('Página de Aprovação do Gestor').first().json['Motivo da reprovação'] || 'Não informado pelo gestor.' }}\n\n` +
  `Procure seu gestor para mais detalhes.\n\n` +
  `-- Sistema de Férias (automação n8n)`;

function gmail(nome: string, idNo: string, pos: [number, number], para: string, assunto: string, mensagem: string) {
  return {
    parameters: { resource: 'message', operation: 'send', sendTo: para, subject: assunto, emailType: 'text', message: mensagem, options: {} },
    id: idNo, name: nome, type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position: pos, credentials: credBlock,
  };
}

const EMAIL_COLAB = "={{ $('Calcular Regras').first().json.colaborador.email }}";

const cliente = criarCliente();
const wf = (await cliente.obterWorkflow(id)) as {
  name: string; nodes: Array<Record<string, unknown>>; connections: Record<string, Record<string, unknown>>; settings: unknown;
};

const porNome = (n: string) => wf.nodes.find((x) => x.name === n);

// Remove nós que este script cria (idempotência)
const criados = new Set(['E-mail Reprovação Automática', 'Decisão do Gestor', 'E-mail Reprovação Gestor', 'Página Reprovado']);
wf.nodes = wf.nodes.filter((n) => !criados.has(n.name as string));

// --- 1) Reconfigura a Página de Aprovação do Gestor com opções reais ---
const pagGestor = porNome('Página de Aprovação do Gestor')!;
const posPagGestor = (pagGestor.position as [number, number]) || [1568, 304];
pagGestor.parameters = {
  formTitle: 'Aprovação de Férias — Gestor',
  formDescription: 'Analise a solicitação e escolha aprovar ou reprovar. Em caso de reprovação, informe o motivo.',
  formFields: {
    values: [
      {
        fieldLabel: 'Decisão',
        fieldType: 'radio',
        requiredField: true,
        fieldOptions: { values: [{ option: 'Aprovar' }, { option: 'Reprovar' }] },
      },
      {
        fieldLabel: 'Motivo da reprovação',
        fieldType: 'textarea',
        requiredField: false,
      },
    ],
  },
  options: {},
};

// --- 2) Nós novos ---
const posErro = (porNome('Página de Erro')!.position as [number, number]) || [1264, 512];
const emailReprovaAuto = gmail(
  'E-mail Reprovação Automática',
  'ferias-email-reprova-auto',
  [posErro[0] - 240, posErro[1]],
  EMAIL_COLAB,
  'Sua solicitação de férias foi reprovada',
  CORPO_REPROVA_AUTO,
);

const decisaoGestor = {
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
      combinator: 'and',
      conditions: [
        {
          leftValue: "={{ $json['Decisão'] }}",
          rightValue: 'Aprovar',
          operator: { type: 'string', operation: 'equals' },
        },
      ],
    },
    options: {},
  },
  id: 'ferias-decisao-gestor',
  name: 'Decisão do Gestor',
  type: 'n8n-nodes-base.if',
  typeVersion: 2.3,
  position: [posPagGestor[0] + 220, posPagGestor[1]],
};

const regConcl = porNome('Registrar Conclusão')!;
const posRegConcl = (regConcl.position as [number, number]) || [1824, 304];

const emailReprovaGestor = gmail(
  'E-mail Reprovação Gestor',
  'ferias-email-reprova-gestor',
  [posRegConcl[0], posRegConcl[1] + 200],
  EMAIL_COLAB,
  'Sua solicitação de férias foi reprovada pelo gestor',
  CORPO_REPROVA_GESTOR,
);

const pagReprovado = {
  parameters: { operation: 'completion', respondWith: 'showText',
    completionTitle: 'Férias reprovadas',
    completionMessage: 'A solicitação foi reprovada e o colaborador foi notificado por e-mail com o motivo.' ,
  },
  id: 'ferias-pagina-reprovado',
  name: 'Página Reprovado',
  type: 'n8n-nodes-base.form',
  typeVersion: 2.5,
  position: [posRegConcl[0] + 260, posRegConcl[1] + 200],
  webhookId: 'ferias-reprovado-webhook',
};

wf.nodes.push(emailReprovaAuto, decisaoGestor, emailReprovaGestor, pagReprovado);

// --- 3) Reconexões ---
// Decidir: true -> Enviar E-mail ao Gestor (mantém); false -> E-mail Reprovação Automática
wf.connections['Decidir'] = {
  main: [
    [{ node: 'Enviar E-mail ao Gestor', type: 'main', index: 0 }],
    [{ node: 'E-mail Reprovação Automática', type: 'main', index: 0 }],
  ],
};
wf.connections['E-mail Reprovação Automática'] = {
  main: [[{ node: 'Página de Erro', type: 'main', index: 0 }]],
};

// Página de Aprovação do Gestor -> Decisão do Gestor
wf.connections['Página de Aprovação do Gestor'] = {
  main: [[{ node: 'Decisão do Gestor', type: 'main', index: 0 }]],
};
// Decisão do Gestor: true(Aprovar) -> Registrar Conclusão; false(Reprovar) -> E-mail Reprovação Gestor
wf.connections['Decisão do Gestor'] = {
  main: [
    [{ node: 'Registrar Conclusão', type: 'main', index: 0 }],
    [{ node: 'E-mail Reprovação Gestor', type: 'main', index: 0 }],
  ],
};
wf.connections['E-mail Reprovação Gestor'] = {
  main: [[{ node: 'Página Reprovado', type: 'main', index: 0 }]],
};

await cliente.request(`/workflows/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }),
});
console.log(`Fluxo ${id}: caminhos de reprovação (automática e do gestor) adicionados com e-mail ao colaborador.`);
