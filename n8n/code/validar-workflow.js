// ===== ARQUIVO GERADO por scripts/n8n/build-code-nodes.ts — não edite à mão =====
// Code node (Run Once for All Items). Sem require/process/$env.

const CATALOGO = [
  {
    "type": "n8n-nodes-base.manualTrigger",
    "typeVersion": 1,
    "categoria": "gatilho",
    "descricao": "Inicia o fluxo manualmente ao clicar em Executar. Útil para testes.",
    "obrigatorios": []
  },
  {
    "type": "n8n-nodes-base.scheduleTrigger",
    "typeVersion": 1.4,
    "categoria": "gatilho",
    "descricao": "Dispara o fluxo em intervalos de tempo (cron/intervalo).",
    "obrigatorios": [
      "rule"
    ]
  },
  {
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 2.2,
    "categoria": "gatilho",
    "descricao": "Recebe requisições HTTP para iniciar o fluxo. Define método e caminho.",
    "obrigatorios": [
      "httpMethod",
      "path"
    ]
  },
  {
    "type": "n8n-nodes-base.formTrigger",
    "typeVersion": 2.6,
    "categoria": "gatilho",
    "descricao": "Gera um formulário web que inicia o fluxo ao ser enviado.",
    "obrigatorios": [
      "formTitle",
      "formFields"
    ]
  },
  {
    "type": "n8n-nodes-base.gmailTrigger",
    "typeVersion": 1.4,
    "categoria": "gatilho",
    "descricao": "Dispara o fluxo quando um novo e-mail chega no Gmail.",
    "obrigatorios": []
  },
  {
    "type": "n8n-nodes-base.telegramTrigger",
    "typeVersion": 1.5,
    "categoria": "gatilho",
    "descricao": "Dispara o fluxo ao receber uma mensagem no bot do Telegram.",
    "obrigatorios": [
      "updates"
    ]
  },
  {
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.5,
    "categoria": "acao",
    "descricao": "Faz requisições HTTP a APIs externas (GET, POST, etc.).",
    "obrigatorios": [
      "url"
    ]
  },
  {
    "type": "n8n-nodes-base.set",
    "typeVersion": 3.5,
    "categoria": "acao",
    "descricao": "Define ou transforma campos dos itens que passam pelo fluxo.",
    "obrigatorios": [
      "assignments"
    ]
  },
  {
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.3,
    "categoria": "acao",
    "descricao": "Ramifica o fluxo em duas saídas (true/false) conforme condições.",
    "obrigatorios": [
      "conditions"
    ]
  },
  {
    "type": "n8n-nodes-base.switch",
    "typeVersion": 3.4,
    "categoria": "acao",
    "descricao": "Ramifica o fluxo em múltiplas saídas conforme regras.",
    "obrigatorios": [
      "rules"
    ]
  },
  {
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "categoria": "acao",
    "descricao": "Executa JavaScript para transformar dados (sem acesso a $env, require ou rede).",
    "obrigatorios": [
      "jsCode"
    ]
  },
  {
    "type": "n8n-nodes-base.merge",
    "typeVersion": 3.2,
    "categoria": "acao",
    "descricao": "Combina dados de múltiplas entradas em uma saída.",
    "obrigatorios": []
  },
  {
    "type": "n8n-nodes-base.wait",
    "typeVersion": 1.1,
    "categoria": "acao",
    "descricao": "Pausa o fluxo por um tempo ou até um evento (webhook).",
    "obrigatorios": []
  },
  {
    "type": "n8n-nodes-base.filter",
    "typeVersion": 2.3,
    "categoria": "acao",
    "descricao": "Mantém apenas os itens que satisfazem as condições.",
    "obrigatorios": [
      "conditions"
    ]
  },
  {
    "type": "n8n-nodes-base.splitOut",
    "typeVersion": 1.1,
    "categoria": "acao",
    "descricao": "Separa uma lista dentro de um item em vários itens.",
    "obrigatorios": [
      "fieldToSplitOut"
    ]
  },
  {
    "type": "n8n-nodes-base.aggregate",
    "typeVersion": 1,
    "categoria": "acao",
    "descricao": "Agrega vários itens em um só (ex.: junta campos em uma lista).",
    "obrigatorios": []
  },
  {
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1.5,
    "categoria": "acao",
    "descricao": "Envia a resposta HTTP para um Webhook que iniciou o fluxo.",
    "obrigatorios": []
  },
  {
    "type": "n8n-nodes-base.noOp",
    "typeVersion": 1,
    "categoria": "acao",
    "descricao": "Não faz nada; útil como ponto de junção ou marcador.",
    "obrigatorios": []
  },
  {
    "type": "n8n-nodes-base.gmail",
    "typeVersion": 2.2,
    "categoria": "acao",
    "descricao": "Envia e gerencia e-mails no Gmail.",
    "obrigatorios": [
      "resource",
      "operation"
    ]
  },
  {
    "type": "n8n-nodes-base.slack",
    "typeVersion": 2.7,
    "categoria": "acao",
    "descricao": "Envia mensagens e interage com o Slack.",
    "obrigatorios": [
      "resource",
      "operation"
    ]
  },
  {
    "type": "n8n-nodes-base.telegram",
    "typeVersion": 1.2,
    "categoria": "acao",
    "descricao": "Envia mensagens pelo bot do Telegram.",
    "obrigatorios": [
      "resource",
      "operation"
    ]
  },
  {
    "type": "n8n-nodes-base.googleSheets",
    "typeVersion": 4.7,
    "categoria": "acao",
    "descricao": "Lê e escreve dados em planilhas do Google Sheets.",
    "obrigatorios": [
      "resource",
      "operation"
    ]
  },
  {
    "type": "n8n-nodes-base.airtable",
    "typeVersion": 2.2,
    "categoria": "acao",
    "descricao": "Lê e escreve registros no Airtable.",
    "obrigatorios": [
      "resource",
      "operation"
    ]
  },
  {
    "type": "n8n-nodes-base.form",
    "typeVersion": 2.5,
    "categoria": "acao",
    "descricao": "Página de formulário adicional ou tela final (Form Ending). Requer um Form Trigger no início.",
    "obrigatorios": [
      "operation"
    ]
  },
  {
    "type": "@n8n/n8n-nodes-langchain.chainLlm",
    "typeVersion": 1.9,
    "categoria": "ia",
    "descricao": "Nó de IA que envia um prompt a um modelo de linguagem e devolve a resposta em texto. Exige um nó de modelo (Gemini Chat Model) conectado na porta ai_languageModel. Use para avaliar/decidir em linguagem natural (ex.: validar regras de negócio). Responde em $json.text.",
    "obrigatorios": [
      "text"
    ]
  },
  {
    "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
    "typeVersion": 1.3,
    "categoria": "ia",
    "descricao": "Modelo de linguagem OpenAI. É um sub-nó: conecta-se SEMPRE na porta ai_languageModel de um Basic LLM Chain (nunca por main). A credencial é configurada automaticamente.",
    "obrigatorios": []
  }
];

const CRED_IA = {"tipo":"openAiApi","id":"xx5KZ3u8XHEEQtpY","name":"OpenAI Meta-Fluxo"};

// --- libs ---
/**
 * Gera UUID v4. Implementação própria, sem depender de `crypto` (bloqueado no
 * Code node do n8n em task runner). Usa Math.random — suficiente para IDs de nós.
 */
function uuidV4() {
    const hex = '0123456789abcdef';
    let s = '';
    for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
            s += '-';
        }
        else if (i === 14) {
            s += '4';
        }
        else if (i === 19) {
            s += hex[(Math.floor(Math.random() * 16) & 0x3) | 0x8];
        }
        else {
            s += hex[Math.floor(Math.random() * 16)];
        }
    }
    return s;
}
const PASSO_X = 260;
const PASSO_Y = 160;
const ORIGEM_X = 0;
const ORIGEM_Y = 300;
/** Nós sem nenhuma conexão de entrada (candidatos a raiz). */
function semEntrada(nomes, connections) {
    const temEntrada = new Set();
    for (const origem of Object.keys(connections)) {
        const saidas = connections[origem]?.main ?? [];
        for (const porta of saidas) {
            for (const alvo of porta ?? []) {
                if (alvo?.node)
                    temEntrada.add(alvo.node);
            }
        }
    }
    return nomes.filter((n) => !temEntrada.has(n));
}
/** Calcula a profundidade (coluna) de cada nó por BFS a partir das raízes. */
function calcularProfundidades(nomes, connections) {
    const prof = new Map();
    let raizes = semEntrada(nomes, connections);
    if (raizes.length === 0 && nomes.length > 0)
        raizes = [nomes[0]]; // ciclo sem raiz
    const fila = raizes.map((n) => ({ node: n, d: 0 }));
    for (const r of raizes)
        prof.set(r, 0);
    let guard = 0;
    const maxIter = nomes.length * nomes.length + 10;
    while (fila.length > 0 && guard++ < maxIter) {
        const { node, d } = fila.shift();
        const saidas = connections[node]?.main ?? [];
        for (const porta of saidas) {
            for (const alvo of porta ?? []) {
                const nome = alvo?.node;
                if (!nome)
                    continue;
                const atual = prof.get(nome);
                if (atual === undefined || d + 1 > atual) {
                    prof.set(nome, d + 1);
                    fila.push({ node: nome, d: d + 1 });
                }
            }
        }
    }
    // nós não alcançados (desconectados) ficam na coluna 0
    for (const n of nomes)
        if (!prof.has(n))
            prof.set(n, 0);
    return prof;
}
/**
 * Retorna um mapa nome -> [x, y]. Nós na mesma coluna são empilhados
 * verticalmente de forma determinística (ordem de `nomes`).
 */
function calcularPosicoes(nomes, connections) {
    const prof = calcularProfundidades(nomes, connections);
    const porColuna = new Map();
    for (const n of nomes) {
        const c = prof.get(n) ?? 0;
        if (!porColuna.has(c))
            porColuna.set(c, []);
        porColuna.get(c).push(n);
    }
    const pos = new Map();
    for (const [coluna, lista] of porColuna) {
        lista.forEach((nome, i) => {
            pos.set(nome, [ORIGEM_X + coluna * PASSO_X, ORIGEM_Y + i * PASSO_Y]);
        });
    }
    return pos;
}
const CAMPOS_PROIBIDOS = ['id', 'active', 'tags', 'pinData', 'versionId', 'meta', 'staticData', 'createdAt', 'updatedAt'];
/** Extrai o primeiro objeto JSON de um texto (tolera cercas ```json e ruído). */
function extrairJson(texto) {
    if (texto == null)
        return { obj: null, erro: 'Resposta vazia da LLM.' };
    let t = String(texto).trim();
    // Remove cercas de código ```json ... ``` ou ``` ... ```
    const cerca = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (cerca)
        t = cerca[1].trim();
    // Tenta direto
    try {
        return { obj: JSON.parse(t) };
    }
    catch {
        // Procura o primeiro { ... } balanceado
    }
    const inicio = t.indexOf('{');
    if (inicio === -1)
        return { obj: null, erro: 'Nenhum objeto JSON encontrado na resposta.' };
    let nivel = 0;
    let emString = false;
    let escape = false;
    for (let i = inicio; i < t.length; i++) {
        const c = t[i];
        if (emString) {
            if (escape)
                escape = false;
            else if (c === '\\')
                escape = true;
            else if (c === '"')
                emString = false;
            continue;
        }
        if (c === '"')
            emString = true;
        else if (c === '{')
            nivel++;
        else if (c === '}') {
            nivel--;
            if (nivel === 0) {
                const candidato = t.slice(inicio, i + 1);
                try {
                    return { obj: JSON.parse(candidato) };
                }
                catch (e) {
                    return { obj: null, erro: `JSON malformado: ${e.message}` };
                }
            }
        }
    }
    return { obj: null, erro: 'JSON incompleto (chaves não balanceadas).' };
}
/**
 * Valida e sanitiza. `catalogo` é o array de entradas permitidas.
 * `nomeDesejado` compõe o nome final "[IA] <nome>".
 */
function validarWorkflow(respostaLlm, catalogo, nomeDesejado, opcoes = {}) {
    const erros = [];
    const avisos = [];
    const { obj, erro } = extrairJson(respostaLlm);
    if (!obj) {
        return { ok: false, erros: [erro ?? 'Falha ao extrair JSON.'], avisos };
    }
    // Caso "impossível"
    const anyObj = obj;
    if (anyObj.impossivel === true) {
        return {
            ok: false,
            impossivel: true,
            motivo: typeof anyObj.motivo === 'string' ? anyObj.motivo : 'A LLM indicou que o pedido é inviável.',
            erros: [],
            avisos,
        };
    }
    const nodes = anyObj.nodes;
    const connections = (anyObj.connections ?? {});
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return { ok: false, erros: ['O JSON não contém a lista "nodes" com ao menos um nó.'], avisos };
    }
    const porTipo = new Map();
    for (const c of catalogo)
        porTipo.set(c.type, c);
    const nomesVistos = new Set();
    const nomesDuplicados = new Set();
    let temGatilho = false;
    const nosSanitizados = [];
    for (const raw of nodes) {
        if (!raw || typeof raw !== 'object') {
            erros.push('Há um nó que não é um objeto válido.');
            continue;
        }
        const nome = raw.name;
        if (!nome || typeof nome !== 'string') {
            erros.push('Há um nó sem a propriedade "name".');
            continue;
        }
        if (nomesVistos.has(nome))
            nomesDuplicados.add(nome);
        nomesVistos.add(nome);
        const entrada = porTipo.get(raw.type);
        if (!entrada) {
            erros.push(`O nó "${nome}" usa o tipo "${raw.type}", que não está no catálogo permitido.`);
            continue;
        }
        if (entrada.categoria === 'gatilho')
            temGatilho = true;
        // Parâmetros obrigatórios
        const params = (raw.parameters ?? {});
        for (const obrig of entrada.obrigatorios) {
            if (params[obrig] === undefined || params[obrig] === null || params[obrig] === '') {
                erros.push(`O nó "${nome}" (${entrada.type}) está sem o parâmetro obrigatório "${obrig}".`);
            }
        }
        // Monta nó sanitizado (remove campos proibidos; força typeVersion do catálogo)
        const limpo = {
            id: uuidV4(),
            name: nome,
            type: raw.type,
            typeVersion: entrada.typeVersion,
            parameters: params,
            position: [0, 0],
        };
        // webhookId para nós que o exigem (webhook, form, formTrigger) — não para o form-ending interno
        if (/\.webhook$|formTrigger$|\.form$/i.test(raw.type)) {
            limpo.webhookId = uuidV4();
        }
        // Chat Model de IA (OpenAI/Gemini): anexa a credencial automaticamente (sub-nó de IA).
        if (/lmChat/i.test(raw.type) && opcoes.credIA) {
            limpo.credentials = { [opcoes.credIA.tipo]: { id: opcoes.credIA.id, name: opcoes.credIA.name } };
        }
        // OpenAI Chat Model v1.3 espera "model" como resource locator { __rl, mode, value }.
        // A LLM costuma gerar como string simples; normalizamos aqui.
        if (/lmChatOpenAi$/i.test(raw.type)) {
            const m = params.model;
            if (typeof m === 'string') {
                params.model = { __rl: true, mode: 'list', value: m };
            }
            else if (!m || typeof m !== 'object') {
                params.model = { __rl: true, mode: 'list', value: 'gpt-4o-mini' };
            }
        }
        if (/gmail|slack|telegram|googleSheets|airtable/i.test(raw.type)) {
            // Demais nós que exigem credencial: aviso (configurada manualmente no n8n).
            avisos.push(`O nó "${nome}" (${entrada.type}) precisa de uma credencial configurada manualmente no n8n.`);
        }
        nosSanitizados.push(limpo);
    }
    for (const dup of nomesDuplicados) {
        erros.push(`O nome de nó "${dup}" está duplicado; os nomes devem ser únicos.`);
    }
    if (!temGatilho) {
        erros.push('O workflow precisa de pelo menos um nó de gatilho (ex.: Webhook, Schedule, Form).');
    }
    // Validação de conexões: alvos e origens devem existir.
    // Suporta qualquer tipo de porta (main, ai_languageModel, etc.).
    const nomesValidos = new Set(nosSanitizados.map((n) => n.name));
    for (const origem of Object.keys(connections)) {
        if (!nomesValidos.has(origem)) {
            erros.push(`As conexões citam o nó de origem "${origem}", que não existe no workflow.`);
        }
        const porTipoPorta = connections[origem];
        for (const tipoPorta of Object.keys(porTipoPorta ?? {})) {
            for (const porta of porTipoPorta[tipoPorta] ?? []) {
                for (const alvo of porta ?? []) {
                    if (alvo?.node && !nomesValidos.has(alvo.node)) {
                        erros.push(`A conexão a partir de "${origem}" aponta para "${alvo.node}", que não existe no workflow.`);
                    }
                }
            }
        }
    }
    // Regra: todo Basic LLM Chain precisa de um modelo (lmChat*) conectado via ai_languageModel.
    const chains = nosSanitizados.filter((n) => /chainLlm$/i.test(n.type));
    if (chains.length > 0) {
        const temModelo = nosSanitizados.some((n) => /lmChat/i.test(n.type));
        // mapeia quais chains recebem um ai_languageModel
        const chainsComModelo = new Set();
        for (const origem of Object.keys(connections)) {
            const portas = connections[origem];
            for (const porta of portas?.ai_languageModel ?? []) {
                for (const alvo of porta ?? []) {
                    if (alvo?.node)
                        chainsComModelo.add(alvo.node);
                }
            }
        }
        if (!temModelo) {
            erros.push('Há um "Basic LLM Chain" mas falta um nó de modelo (ex.: OpenAI Chat Model) conectado a ele pela porta ai_languageModel.');
        }
        else {
            for (const chain of chains) {
                if (!chainsComModelo.has(chain.name)) {
                    erros.push(`O nó "${chain.name}" (Basic LLM Chain) não tem um modelo conectado na porta ai_languageModel. Adicione um OpenAI Chat Model conectado a ele.`);
                }
            }
        }
    }
    // Regra: nós de ação/IA órfãos (sem entrada E sem saída) indicam fluxo incompleto.
    if (nosSanitizados.length > 1) {
        const temEntrada = new Set();
        const temSaida = new Set();
        for (const origem of Object.keys(connections)) {
            const portas = connections[origem];
            let origemTemAlgumaSaida = false;
            for (const tipoPorta of Object.keys(portas ?? {})) {
                for (const porta of portas[tipoPorta] ?? []) {
                    for (const alvo of porta ?? []) {
                        if (alvo?.node) {
                            temEntrada.add(alvo.node);
                            origemTemAlgumaSaida = true;
                        }
                    }
                }
            }
            if (origemTemAlgumaSaida)
                temSaida.add(origem);
        }
        for (const n of nosSanitizados) {
            if (porTipo.get(n.type)?.categoria === 'gatilho')
                continue; // gatilho não tem entrada
            if (/lmChat/i.test(n.type))
                continue; // modelo de IA conecta só por ai_languageModel (já checado acima)
            if (!temEntrada.has(n.name) && !temSaida.has(n.name)) {
                erros.push(`O nó "${n.name}" está solto (sem conexões). Conecte-o ao fluxo ou remova-o.`);
            }
        }
    }
    if (erros.length > 0) {
        return { ok: false, erros, avisos };
    }
    // Normaliza conexões de If: a LLM às vezes gera uma porta "false"/"true" separada,
    // mas o n8n If usa main[0]=true e main[1]=false. Converte para o formato correto.
    const tiposPorNome = new Map(nosSanitizados.map((n) => [n.name, n.type]));
    for (const origem of Object.keys(connections)) {
        if (!/\.if$/i.test(tiposPorNome.get(origem) ?? ''))
            continue;
        const portas = connections[origem];
        const main = (Array.isArray(portas.main) ? portas.main : []);
        const mainNorm = [main[0] ?? [], main[1] ?? []];
        if ('true' in portas && Array.isArray(portas.true)) {
            mainNorm[0] = (portas.true)[0] ?? mainNorm[0];
            delete portas.true;
        }
        if ('false' in portas && Array.isArray(portas.false)) {
            mainNorm[1] = (portas.false)[0] ?? mainNorm[1];
            delete portas.false;
        }
        portas.main = mainNorm;
    }
    // Recalcula posições (layout limpo)
    const pos = calcularPosicoes(nosSanitizados.map((n) => n.name), connections);
    for (const n of nosSanitizados) {
        n.position = pos.get(n.name) ?? [0, 300];
    }
    // Limpa campos proibidos de nível raiz implicitamente (não copiamos nada além do permitido)
    void CAMPOS_PROIBIDOS;
    const nomeFinal = `[IA] ${nomeDesejado}`.trim();
    const workflow = {
        name: nomeFinal,
        nodes: nosSanitizados,
        connections,
        settings: { executionOrder: 'v1' },
    };
    const resumo = `${nosSanitizados.length} nós, ${Object.keys(connections).length} conexões de origem.`;
    return { ok: true, workflow, erros: [], avisos, resumo };
}


// --- entrada ---
// Trecho de entrada do Code node "Validar e Sanitizar" (Run Once for All Items).
// Depende de: CATALOGO (constante), validarWorkflow (lib embutida).
// Entrada: $json com a resposta da LLM; o estado vem de $('Montar Prompt').
// Saída: { ok, workflow?, erros, avisos, impossivel?, motivo?, tentativa, resumo }

const item = $input.first().json;
// A resposta da LLM pode vir em campos diferentes conforme o nó de IA:
const resposta =
  item.text ??
  item.output ??
  item.response ??
  (item.message && item.message.content) ??
  (typeof item === 'string' ? item : JSON.stringify(item));

const estado = $('Montar Prompt').last().json;
const nomeDesejado = (estado && estado.nomeFluxo) || 'Fluxo Gerado';
const tentativa = (estado && estado.tentativa) || 1;

const nosValid = CATALOGO.map((n) => ({
  type: n.type,
  typeVersion: n.typeVersion,
  categoria: n.categoria,
  obrigatorios: n.obrigatorios,
}));

// CRED_IA é injetada pelo build ({ tipo, id, name } da credencial do chat model),
// para que os nós de IA dos fluxos gerados já saiam com a credencial anexada.
const opcoes = typeof CRED_IA !== 'undefined' && CRED_IA ? { credIA: CRED_IA } : {};
const r = validarWorkflow(resposta, nosValid, nomeDesejado, opcoes);
return [{ json: Object.assign({}, r, { tentativa }) }];
