/**
 * Monta o fluxo "[IA] Triagem de Reclamações" na instância local do n8n.
 *
 * Fluxo:
 *   Formulário de Reclamação (Form Trigger: nome, email, assunto, descrição)
 *     -> Criar Card (Trello, lista N1 - Atendimento Chatbot)
 *     -> Ler Cards Abertos (Trello: cards das listas N1/N2/N3) [insumo]
 *     -> Montar Contexto (Code: resume os cards abertos + dados da reclamação)
 *     -> Avaliar (chainLlm) + Modelo (lmChatOpenAi via ai_languageModel)
 *     -> Ler Decisão (Code: parseia o JSON da IA, tolerante)
 *     -> Comentar no Card (Trello addComment)
 *     -> Enviar E-mail ao Cliente (Gmail)
 *     -> Rotear (Switch por decisao): resolvido | humano | em_andamento
 *          resolvido     -> Mover para Concluído (Trello update list)
 *          humano        -> Mover para N2 - Atendimento Humano
 *          em_andamento  -> Mover para a lista do status detectado (N2/N3) via expressão
 *
 * Idempotente: recria o workflow se já existir (pelo nome) via _reclamacoes em .credenciais.json.
 *
 * Uso: tsx montar-reclamacoes.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPA = path.join(__dirname, '.credenciais.json');
const creds = JSON.parse(fs.readFileSync(MAPA, 'utf8'));

const CRED_TRELLO = { trelloApi: { id: creds.trelloApi.id, name: creds.trelloApi.name } };
const CRED_GMAIL = { gmailOAuth2: { id: creds.gmailOAuth2.id, name: creds.gmailOAuth2.name } };
const CRED_OPENAI = { openAiApi: { id: creds.openAiApi.id, name: creds.openAiApi.name } };
const L = creds._trelloBoard.listas; // n1_chatbot, n2_humano, n3_desenvolvimento, concluido
const BOARD = creds._trelloBoard.boardId;

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0; const v = c === 'x' ? r : (r & 0x3) | 0x8; return v.toString(16);
});

// ---------- Code: Montar Contexto para a IA ----------
const JS_CONTEXTO = `// Resume os cards abertos (insumo) e os dados da reclamação para a IA.
const form = $('Formulário de Reclamação').first().json;
const cards = $('Ler Cards Abertos').all().map(i => i.json);

// Mapa listId -> status legível
const LISTAS = ${JSON.stringify({
  [L.n1_chatbot]: 'N1 - Atendimento Chatbot',
  [L.n2_humano]: 'N2 - Atendimento Humano',
  [L.n3_desenvolvimento]: 'N3 - Desenvolvimento',
  [L.concluido]: 'Concluído',
})};

const cardAtualId = $('Criar Card').first().json.id;

const abertos = cards
  .filter(c => c.id !== cardAtualId)
  .map(c => ({ nome: c.name, descricao: (c.desc||'').slice(0,300), status: LISTAS[c.idList] || c.idList }));

return [{ json: {
  reclamacao: {
    nome: form['Nome'] ?? form.nome,
    email: form['E-mail'] ?? form.email,
    assunto: form['Assunto'] ?? form.assunto,
    descricao: form['Descrição'] ?? form['Descricao'] ?? form.descricao,
  },
  cardId: cardAtualId,
  cardsAbertos: abertos,
} }];`;

// ---------- chainLlm prompt ----------
const PROMPT = `=Você é um agente de triagem de suporte (N1). Analise a reclamação do cliente e os chamados já abertos no quadro (insumo) e decida o encaminhamento.

Reclamação:
{{ JSON.stringify($json.reclamacao) }}

Chamados já abertos no quadro (para você evitar duplicar e identificar se o problema já está sendo tratado):
{{ JSON.stringify($json.cardsAbertos) }}

Regras de decisão:
- "resolvido": você consegue resolver/responder diretamente (dúvida simples, orientação, informação). O chamado será movido para Concluído.
- "humano": precisa de atendimento humano (reclamação sem solução automática, insatisfação, pedido de reembolso, etc.). Move para "N2 - Atendimento Humano" e informe prazo de 48 horas.
- "em_andamento": o problema JÁ aparece entre os chamados abertos (mesmo bug/assunto). Use o status onde ele já está (N2 - Atendimento Humano, ou N3 - Desenvolvimento) e informe o cliente que já está em tratamento.

Responda ESTRITAMENTE em JSON:
{"decisao":"resolvido|humano|em_andamento","statusExistente":"N2 - Atendimento Humano|N3 - Desenvolvimento|null","prazoHoras":48,"respostaCliente":"texto cordial e claro para enviar por e-mail","comentarioCard":"resumo objetivo para registrar no card"}

Em respostaCliente escreva apenas o corpo da mensagem, em um único parágrafo corrido, SEM saudação inicial (não comece com "Olá"), SEM assinatura e SEM quebras de linha ou o caractere \\n (a saudação e a assinatura são adicionadas automaticamente). Em "humano" e "em_andamento" mencione o prazo de 48 horas quando fizer sentido. Não invente dados.`;

// ---------- Code: Ler Decisão ----------
const JS_DECISAO = `const texto = String($json.text ?? $json.output ?? '');
let obj;
try { obj = JSON.parse(texto); }
catch (e) {
  const cerca = texto.match(/\\\`\\\`\\\`(?:json)?\\s*([\\s\\S]*?)\\\`\\\`\\\`/i);
  const corpo = cerca ? cerca[1] : texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1);
  obj = JSON.parse(corpo);
}
const ctx = $('Montar Contexto').first().json;
const LISTAS_ID = ${JSON.stringify({
  'N2 - Atendimento Humano': L.n2_humano,
  'N3 - Desenvolvimento': L.n3_desenvolvimento,
})};
let listaDestino;
if (obj.decisao === 'resolvido') listaDestino = '${L.concluido}';
else if (obj.decisao === 'humano') listaDestino = '${L.n2_humano}';
else listaDestino = LISTAS_ID[obj.statusExistente] || '${L.n2_humano}';
// Normaliza quebras de linha: a IA às vezes devolve "\\n" literal no texto.
const limpar = (s) => String(s || '').replace(/\\\\r\\\\n|\\\\n|\\\\r/g, '\\n').replace(/\\r\\n/g, '\\n');
return [{ json: {
  decisao: obj.decisao,
  statusExistente: obj.statusExistente || null,
  prazoHoras: obj.prazoHoras || 48,
  respostaCliente: limpar(obj.respostaCliente),
  comentarioCard: limpar(obj.comentarioCard).replace(/\\n+/g, ' '),
  listaDestino,
  cardId: ctx.cardId,
  email: ctx.reclamacao.email,
  nome: ctx.reclamacao.nome,
  assunto: ctx.reclamacao.assunto,
  // Corpo do e-mail já montado com quebras de linha REAIS (evita \\n literal no envio).
  corpoEmail: 'Olá ' + ctx.reclamacao.nome + ',\\n\\n' + limpar(obj.respostaCliente) + '\\n\\n-- Central de Reclamações (automação n8n)',
} }];`;

// Comentário de tracking: registra no card o conteúdo EXATO enviado ao cliente.
const JS_TRACKING = `const d = $('Ler Decisão').first().json;
const envio = $('Enviar E-mail ao Cliente').first().json;
const comentario =
  '📧 Resposta enviada ao cliente — triagem: ' + d.decisao + '\\n' +
  'Para: ' + d.email + '\\n' +
  'Assunto: Sua reclamação: ' + d.assunto + '\\n' +
  (envio && envio.id ? 'ID Gmail: ' + envio.id + ' (enviado)\\n' : '') +
  '-------------------------------------------\\n' +
  d.corpoEmail + '\\n' +
  '-------------------------------------------\\n' +
  'Observações da triagem: ' + d.comentarioCard;
return [{ json: { cardId: d.cardId, comentario } }];`;

const nodes: Array<Record<string, unknown>> = [
  {
    parameters: {
      formTitle: 'Central de Reclamações',
      formDescription: 'Registre sua reclamação. Nossa equipe fará a triagem e retornará por e-mail.',
      formFields: { values: [
        { fieldLabel: 'Nome', fieldType: 'text', requiredField: true },
        { fieldLabel: 'E-mail', fieldType: 'email', requiredField: true },
        { fieldLabel: 'Assunto', fieldType: 'text', requiredField: true },
        { fieldLabel: 'Descrição', fieldType: 'textarea', requiredField: true },
      ] },
      options: {},
    },
    id: uuid(), name: 'Formulário de Reclamação', type: 'n8n-nodes-base.formTrigger',
    typeVersion: 2.6, position: [0, 400], webhookId: 'reclamacoes-form',
  },
  {
    parameters: {
      resource: 'card', operation: 'create',
      listId: L.n1_chatbot,
      name: "={{ $json['Assunto'] }}",
      additionalFields: { desc: "=Reclamação de {{ $json['Nome'] }} ({{ $json['E-mail'] }}):\\n\\n{{ $json['Descrição'] }}" },
    },
    id: uuid(), name: 'Criar Card', type: 'n8n-nodes-base.trello',
    typeVersion: 1, position: [220, 400], credentials: CRED_TRELLO,
  },
  {
    // HTTP autenticado pela credencial trelloApi do n8n (injeta key+token).
    parameters: {
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'trelloApi',
      url: `=https://api.trello.com/1/boards/${BOARD}/cards`,
      options: {},
    },
    id: uuid(), name: 'Ler Cards Abertos', type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2, position: [440, 400], credentials: CRED_TRELLO,
  },
  {
    parameters: { mode: 'runOnceForAllItems', jsCode: JS_CONTEXTO },
    id: uuid(), name: 'Montar Contexto', type: 'n8n-nodes-base.code',
    typeVersion: 2, position: [660, 400],
  },
  {
    parameters: { promptType: 'define', text: PROMPT, batching: {} },
    id: uuid(), name: 'Avaliar', type: '@n8n/n8n-nodes-langchain.chainLlm',
    typeVersion: 1.9, position: [880, 400],
  },
  {
    parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' }, builtInTools: {}, options: {} },
    id: uuid(), name: 'Modelo', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
    typeVersion: 1.3, position: [880, 620], credentials: CRED_OPENAI,
  },
  {
    parameters: { mode: 'runOnceForAllItems', jsCode: JS_DECISAO },
    id: uuid(), name: 'Ler Decisão', type: 'n8n-nodes-base.code',
    typeVersion: 2, position: [1100, 400],
  },
  {
    parameters: {
      resource: 'card', operation: 'update',
      id: "={{ $json.cardId }}",
      updateFields: { idList: "={{ $json.listaDestino }}" },
    },
    id: uuid(), name: 'Mover Card', type: 'n8n-nodes-base.trello',
    typeVersion: 1, position: [1320, 400], credentials: CRED_TRELLO,
  },
  {
    parameters: {
      resource: 'message', operation: 'send',
      sendTo: "={{ $('Ler Decisão').first().json.email }}",
      subject: "=Sua reclamação: {{ $('Ler Decisão').first().json.assunto }}",
      emailType: 'text',
      message: "={{ $('Ler Decisão').first().json.corpoEmail }}",
      options: {},
    },
    id: uuid(), name: 'Enviar E-mail ao Cliente', type: 'n8n-nodes-base.gmail',
    typeVersion: 2.1, position: [1540, 400], credentials: CRED_GMAIL,
  },
  {
    parameters: { mode: 'runOnceForAllItems', jsCode: JS_TRACKING },
    id: uuid(), name: 'Montar Comentário', type: 'n8n-nodes-base.code',
    typeVersion: 2, position: [1760, 400],
  },
  {
    parameters: {
      resource: 'cardComment', operation: 'create',
      cardId: "={{ $json.cardId }}",
      text: "={{ $json.comentario }}",
    },
    id: uuid(), name: 'Comentar no Card', type: 'n8n-nodes-base.trello',
    typeVersion: 1, position: [1980, 400], credentials: CRED_TRELLO,
  },
];

const connections: Record<string, Record<string, unknown>> = {
  'Formulário de Reclamação': { main: [[{ node: 'Criar Card', type: 'main', index: 0 }]] },
  'Criar Card': { main: [[{ node: 'Ler Cards Abertos', type: 'main', index: 0 }]] },
  'Ler Cards Abertos': { main: [[{ node: 'Montar Contexto', type: 'main', index: 0 }]] },
  'Montar Contexto': { main: [[{ node: 'Avaliar', type: 'main', index: 0 }]] },
  'Modelo': { ai_languageModel: [[{ node: 'Avaliar', type: 'ai_languageModel', index: 0 }]] },
  'Avaliar': { main: [[{ node: 'Ler Decisão', type: 'main', index: 0 }]] },
  'Ler Decisão': { main: [[{ node: 'Mover Card', type: 'main', index: 0 }]] },
  'Mover Card': { main: [[{ node: 'Enviar E-mail ao Cliente', type: 'main', index: 0 }]] },
  'Enviar E-mail ao Cliente': { main: [[{ node: 'Montar Comentário', type: 'main', index: 0 }]] },
  'Montar Comentário': { main: [[{ node: 'Comentar no Card', type: 'main', index: 0 }]] },
};

const cliente = criarCliente();
const payload = { name: '[IA] Triagem de Reclamações', nodes, connections, settings: { executionOrder: 'v1' } };

let id = creds._reclamacoes?.id as string | undefined;
if (id) {
  await cliente.request(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  console.log('Atualizado workflow existente:', id);
} else {
  const r = await cliente.request<{ id: string }>('/workflows', { method: 'POST', body: JSON.stringify(payload) });
  id = r.id;
  creds._reclamacoes = { id, name: payload.name, form: 'reclamacoes-form' };
  fs.writeFileSync(MAPA, JSON.stringify(creds, null, 2) + '\n');
  console.log('Criado workflow:', id);
}
