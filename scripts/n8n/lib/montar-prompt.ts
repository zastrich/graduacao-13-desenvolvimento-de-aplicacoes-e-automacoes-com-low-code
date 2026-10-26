/**
 * Monta o System Prompt e o User Prompt para o nó de IA do Núcleo Gerador.
 * Projetado para rodar em Node (testes) e embutido no Code node (catálogo como
 * constante). Sem dependências externas.
 */

export interface NoCatalogoPrompt {
  type: string;
  typeVersion: number;
  categoria: 'gatilho' | 'acao';
  descricao: string;
  obrigatorios: string[];
}

export interface EstadoPedido {
  nomeFluxo: string;
  gatilho?: string;
  acoes: string;
  detalhes?: string;
  feedback?: string;
  errosAnteriores?: string[];
}

const LIMITE_USER_PROMPT = 8000;

/** Renderiza o catálogo de forma compacta: "- tipo (vX) [gatilho|ação]: descrição. Obrigatórios: a, b". */
export function renderizarCatalogo(nos: NoCatalogoPrompt[]): string {
  return nos
    .map((n) => {
      const cat = n.categoria === 'gatilho' ? 'gatilho' : 'ação';
      const obr = n.obrigatorios.length ? ` Obrigatórios: ${n.obrigatorios.join(', ')}.` : '';
      return `- ${n.type} (v${n.typeVersion}) [${cat}]: ${n.descricao}${obr}`;
    })
    .join('\n');
}

export function montarSystemPrompt(nos: NoCatalogoPrompt[]): string {
  return [
    'Você é um arquiteto especialista em automações n8n.',
    'Sua tarefa é gerar o JSON de um workflow do n8n a partir da solicitação do usuário.',
    '',
    'REGRAS ESTRITAS:',
    '1. Responda APENAS com um objeto JSON válido. Nada de texto antes ou depois, nada de comentários.',
    '2. O objeto deve ter exatamente as chaves "nodes" (array) e "connections" (objeto).',
    '3. Cada nó tem: "name" (único, descritivo em português), "type" e "parameters".',
    '   NÃO inclua "id", "position", "typeVersion", "active", "tags" nem "credentials" — o sistema cuida disso.',
    '4. Use SOMENTE os tipos de nó da lista abaixo. Qualquer outro tipo será rejeitado.',
    '5. O workflow DEVE ter ao menos um nó de gatilho.',
    '6. As conexões usam o NOME do nó, no formato:',
    '   { "Nó A": { "main": [[{ "node": "Nó B", "type": "main", "index": 0 }]] } }',
    '   Para nós If, use DUAS saídas no array main: main[0] = ramo verdadeiro, main[1] = ramo falso.',
    '   Ex.: { "Decidir": { "main": [[{ "node": "SeVerdadeiro", "type": "main", "index": 0 }], [{ "node": "SeFalso", "type": "main", "index": 0 }]] } }',
    '   NUNCA use portas chamadas "true"/"false"; o If usa apenas o array "main" com dois índices.',
    '7. Preencha os parâmetros obrigatórios de cada nó.',
    '8. Não inclua credenciais nem segredos. A credencial do OpenAI Chat Model é anexada automaticamente pelo sistema.',
    '9. Se a solicitação NÃO for uma automação viável com estes nós, responda apenas:',
    '   { "impossivel": true, "motivo": "<explicação curta em português>" }',
    '',
    'NÓS PERMITIDOS:',
    renderizarCatalogo(nos),
    '',
    'PADRÕES OBRIGATÓRIOS (use quando aplicável):',
    '- IA no meio do processo: para avaliar/decidir em linguagem natural, use um "Basic LLM Chain"',
    '  (@n8n/n8n-nodes-langchain.chainLlm). Ele PRECISA de um "OpenAI Chat Model"',
    '  (@n8n/n8n-nodes-langchain.lmChatOpenAi) conectado pela porta "ai_languageModel":',
    '  { "OpenAI Chat Model": { "ai_languageModel": [[{ "node": "Avaliar", "type": "ai_languageModel", "index": 0 }]] } }',
    '  O OpenAI Chat Model NÃO entra no fluxo principal (sem conexão main). A resposta da chain fica em {{ $json.text }}.',
    '  SEMPRE inclua o OpenAI Chat Model no array de nós E a conexão ai_languageModel para a chain. Sem o modelo, a chain falha.',
    '  Peça à chain para responder em JSON (ex.: {"aprovado":true/false,"motivo":"..."}) e, logo depois, use um Code node',
    '  para ler JSON.parse($json.text) e um If/Switch para ramificar (aprovado vs reprovado).',
    '- Base de dados (planilha) para TESTE sem Google Drive: crie um Code node "Base (CSV)" que retorna os dados',
    '  embutidos como objeto com as abas, ex.: return [{ json: { colaboradores: [...], ferias: [...] } }];',
    '  (depois esse nó será trocado pelo Google Sheets/Drive, mantendo os mesmos campos).',
    '- E-mail (sem Gmail conectado agora): represente o envio com um Code node que apenas registra a mensagem,',
    '  ex.: return [{ json: { emailSimulado: true, para: "...", assunto: "...", corpo: "..." } }];',
    '- Aprovação humana (gestor): use um nó "n8n Form (página)" (operation "page") para o gestor decidir,',
    '  com um campo radio Aprovar/Reprovar. O fluxo deve iniciar com um "n8n Form Trigger".',
    '- Validação de REGRAS numéricas/de data (saldo, prazos, antecedência, mínimos): NÃO deixe a IA fazer contas.',
    '  Use um Code node "Calcular Regras" ANTES da IA que calcula tudo de forma determinística (datas via new Date(),',
    '  comparações, saldo) e produz { aprovadoRegras: boolean, violacoes: string[], dados: {...} }. A IA recebe esse',
    '  resultado e apenas redige a justificativa/decisão final em JSON (sem recalcular). Assim a decisão numérica é confiável.',
    '  O Code "Calcular Regras" lê os dados do formulário e da base e cruza por uma chave (ex.: matrícula).',
    '- Erros/respostas ao usuário: use "n8n Form (página)" com operation "completion" e respondWith "showText".',
    '- TODO nó (exceto o gatilho e o OpenAI Chat Model) deve estar conectado ao fluxo. Não deixe nós soltos.',
    '  Se criar uma "Página de Erro", ligue-a a partir de um If/Switch que decide entre seguir ou mostrar o erro.',
    '',
    'EXEMPLO de resposta válida (mínima):',
    '{',
    '  "nodes": [',
    '    { "name": "Início", "type": "n8n-nodes-base.manualTrigger", "parameters": {} },',
    '    { "name": "Definir dados", "type": "n8n-nodes-base.set", "parameters": { "assignments": { "assignments": [] }, "options": {} } }',
    '  ],',
    '  "connections": { "Início": { "main": [[{ "node": "Definir dados", "type": "main", "index": 0 }]] } }',
    '}',
    '',
    'EXEMPLO COMPLETO do bloco de IA (copie este padrão quando usar IA — note o OpenAI Chat Model',
    'no array de nós E a conexão ai_languageModel ligando-o à chain):',
    '{',
    '  "nodes": [',
    '    { "name": "Formulário", "type": "n8n-nodes-base.formTrigger", "parameters": { "formTitle": "X", "formFields": { "values": [{ "fieldLabel": "Texto", "fieldType": "text" }] } } },',
    '    { "name": "Avaliar", "type": "@n8n/n8n-nodes-langchain.chainLlm", "parameters": { "promptType": "define", "text": "Avalie a solicitacao e responda em JSON com aprovado e motivo.", "hasOutputParser": false } },',
    '    { "name": "Modelo", "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi", "parameters": { "model": "gpt-4o-mini", "options": {} } },',
    '    { "name": "Decidir", "type": "n8n-nodes-base.code", "parameters": { "jsCode": "return [{ json: { ok: true } }];" } },',
    '    { "name": "Rota", "type": "n8n-nodes-base.if", "parameters": { "conditions": { "options": { "version": 2 }, "combinator": "and", "conditions": [{ "leftValue": "={{ $json.aprovado }}", "rightValue": true, "operator": { "type": "boolean", "operation": "true", "singleValue": true } }] } } }',
    '  ],',
    '  "connections": {',
    '    "Formulário": { "main": [[{ "node": "Avaliar", "type": "main", "index": 0 }]] },',
    '    "Modelo": { "ai_languageModel": [[{ "node": "Avaliar", "type": "ai_languageModel", "index": 0 }]] },',
    '    "Avaliar": { "main": [[{ "node": "Decidir", "type": "main", "index": 0 }]] },',
    '    "Decidir": { "main": [[{ "node": "Rota", "type": "main", "index": 0 }]] }',
    '  }',
    '}',
  ].join('\n');
}

export function montarUserPrompt(estado: EstadoPedido): string {
  const partes: string[] = [];
  partes.push(`Nome desejado do fluxo: ${estado.nomeFluxo}`);
  if (estado.gatilho) partes.push(`Gatilho inicial desejado: ${estado.gatilho}`);
  partes.push(`Ações esperadas: ${estado.acoes}`);
  if (estado.detalhes && estado.detalhes.trim()) {
    partes.push(`Detalhes adicionais: ${estado.detalhes.trim()}`);
  }
  if (estado.feedback && estado.feedback.trim()) {
    partes.push('');
    partes.push(`Feedback humano para ajustar o fluxo: ${estado.feedback.trim()}`);
  }
  if (estado.errosAnteriores && estado.errosAnteriores.length > 0) {
    partes.push('');
    partes.push('Erros da tentativa anterior (corrija todos):');
    for (const e of estado.errosAnteriores) partes.push(`- ${e}`);
  }
  partes.push('');
  partes.push('Gere agora o JSON do workflow seguindo todas as regras.');

  let texto = partes.join('\n');
  if (texto.length > LIMITE_USER_PROMPT) {
    texto = texto.slice(0, LIMITE_USER_PROMPT) + '\n[...truncado...]';
  }
  return texto;
}

export function montarPrompts(
  estado: EstadoPedido,
  nos: NoCatalogoPrompt[],
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: montarSystemPrompt(nos),
    userPrompt: montarUserPrompt(estado),
  };
}
