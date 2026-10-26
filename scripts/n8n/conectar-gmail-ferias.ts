/**
 * Substitui os nós Code de e-mail simulado do fluxo de férias por nós Gmail reais.
 *
 * - "Enviar E-mail ao Gestor"  -> Gmail (envia ao gestor pedindo ciência da aprovação)
 * - "Registrar Conclusão"      -> Gmail (envia ao colaborador confirmando a aprovação)
 *
 * Os destinatários e nomes vêm da planilha, via $('Calcular Regras') e $('Ler Resposta').
 * Mantém os nomes dos nós e as conexões existentes (apenas troca tipo/parâmetros).
 *
 * Uso: tsx conectar-gmail-ferias.ts <workflowId>
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const id = process.argv[2];
if (!id) {
  console.error('Uso: tsx conectar-gmail-ferias.ts <workflowId>');
  process.exit(1);
}

const creds = JSON.parse(
  readFileSync(path.join(__dirname, '.credenciais.json'), 'utf8'),
) as Record<string, { id: string; name: string }>;
const credGmail = creds.gmailOAuth2;
if (!credGmail?.id) {
  console.error('Credencial gmailOAuth2 não encontrada em .credenciais.json');
  process.exit(1);
}

// Expressões n8n (strings "={{ ... }}") que leem os dados reais da planilha.
const EXPR = {
  emailGestor: "={{ $('Calcular Regras').first().json.colaborador.emailGestor }}",
  nomeGestor: "={{ $('Calcular Regras').first().json.colaborador.gestor }}",
  emailColab: "={{ $('Calcular Regras').first().json.colaborador.email }}",
  nomeColab: "={{ $('Calcular Regras').first().json.colaborador.nome }}",
  inicio: "={{ $('Calcular Regras').first().json.inicio }}",
  fim: "={{ $('Calcular Regras').first().json.fim }}",
  dias: "={{ $('Calcular Regras').first().json.dias }}",
  motivo: "={{ $('Ler Resposta').first().json.motivo }}",
};

const CORPO_GESTOR =
  `=Olá {{ $('Calcular Regras').first().json.colaborador.gestor }},\n\n` +
  `O colaborador {{ $('Calcular Regras').first().json.colaborador.nome }} ` +
  `(matrícula {{ $('Calcular Regras').first().json.matricula }}) teve uma solicitação de férias ` +
  `APROVADA pelas regras automáticas.\n\n` +
  `Período: {{ $('Calcular Regras').first().json.inicio }} a {{ $('Calcular Regras').first().json.fim }} ` +
  `({{ $('Calcular Regras').first().json.dias }} dias).\n\n` +
  `Avaliação: {{ $('Ler Resposta').first().json.motivo }}\n\n` +
  `Por favor, confirme a aprovação na página indicada pelo sistema.\n\n` +
  `-- Sistema de Férias (automação n8n)`;

const CORPO_COLAB =
  `=Olá {{ $('Calcular Regras').first().json.colaborador.nome }},\n\n` +
  `Sua solicitação de férias foi APROVADA.\n\n` +
  `Período: {{ $('Calcular Regras').first().json.inicio }} a {{ $('Calcular Regras').first().json.fim }} ` +
  `({{ $('Calcular Regras').first().json.dias }} dias).\n\n` +
  `{{ $('Ler Resposta').first().json.motivo }}\n\n` +
  `Bom descanso!\n\n` +
  `-- Sistema de Férias (automação n8n)`;

function noGmail(
  nome: string,
  idNo: string,
  pos: [number, number],
  para: string,
  assunto: string,
  mensagem: string,
) {
  return {
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: para,
      subject: assunto,
      emailType: 'text',
      message: mensagem,
      options: {},
    },
    id: idNo,
    name: nome,
    type: 'n8n-nodes-base.gmail',
    typeVersion: 2.1,
    position: pos,
    credentials: {
      gmailOAuth2: { id: credGmail.id, name: credGmail.name },
    },
  };
}

const cliente = criarCliente();
const wf = (await cliente.obterWorkflow(id)) as {
  name: string;
  nodes: Array<Record<string, unknown>>;
  connections: Record<string, Record<string, unknown>>;
  settings: unknown;
};

const antigoGestor = wf.nodes.find((n) => n.name === 'Enviar E-mail ao Gestor');
const antigoConcl = wf.nodes.find((n) => n.name === 'Registrar Conclusão');
if (!antigoGestor || !antigoConcl) {
  console.error('Nós de e-mail esperados não encontrados.');
  process.exit(1);
}
const posGestor = (antigoGestor.position as [number, number]) || [1312, 304];
const posConcl = (antigoConcl.position as [number, number]) || [1824, 304];
const idGestor = antigoGestor.id as string;
const idConcl = antigoConcl.id as string;

// Remove os antigos e insere os nós Gmail com o MESMO nome/posição/id
wf.nodes = wf.nodes.filter(
  (n) => n.name !== 'Enviar E-mail ao Gestor' && n.name !== 'Registrar Conclusão',
);
wf.nodes.push(
  noGmail(
    'Enviar E-mail ao Gestor',
    idGestor,
    posGestor,
    EXPR.emailGestor,
    'Aprovação de Férias — ação necessária',
    CORPO_GESTOR,
  ),
  noGmail(
    'Registrar Conclusão',
    idConcl,
    posConcl,
    EXPR.emailColab,
    'Suas férias foram aprovadas',
    CORPO_COLAB,
  ),
);

// Conexões permanecem as mesmas (os nomes não mudaram).

await cliente.request(`/workflows/${id}`, {
  method: 'PUT',
  body: JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings,
  }),
});
console.log(`Fluxo ${id}: nós de e-mail agora enviam via Gmail (cred ${credGmail.id}).`);
