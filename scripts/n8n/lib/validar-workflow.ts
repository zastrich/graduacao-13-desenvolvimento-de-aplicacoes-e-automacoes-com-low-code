/**
 * Valida e sanitiza o JSON de workflow gerado pela LLM.
 * Projetado para rodar tanto em Node (testes) quanto embutido no Code node do n8n
 * (catálogo passado como parâmetro; sem dependências externas além de uuid/layout).
 */
import { uuidV4 } from './uuid.ts';
import { calcularPosicoes, type Conexoes } from './layout.ts';

export interface EntradaCatalogo {
  type: string;
  typeVersion: number;
  categoria: 'gatilho' | 'acao' | 'ia';
  obrigatorios: string[];
}

export interface OpcoesValidacao {
  /**
   * Credencial do modelo de IA a anexar automaticamente ao nó de chat model.
   * `tipo` é o nome do tipo de credencial no n8n (ex.: "openAiApi", "googlePalmApi").
   */
  credIA?: { tipo: string; id: string; name: string };
}

export interface NoWorkflow {
  id?: string;
  name: string;
  type: string;
  typeVersion?: number;
  parameters?: Record<string, unknown>;
  position?: [number, number];
  webhookId?: string;
  [k: string]: unknown;
}

export interface WorkflowSanitizado {
  name: string;
  nodes: NoWorkflow[];
  connections: Conexoes;
  settings: { executionOrder: 'v1' };
}

export interface ResultadoValidacao {
  ok: boolean;
  workflow?: WorkflowSanitizado;
  erros: string[];
  avisos: string[];
  impossivel?: boolean;
  motivo?: string;
  resumo?: string;
}

const CAMPOS_PROIBIDOS = ['id', 'active', 'tags', 'pinData', 'versionId', 'meta', 'staticData', 'createdAt', 'updatedAt'];

/** Extrai o primeiro objeto JSON de um texto (tolera cercas ```json e ruído). */
export function extrairJson(texto: string): { obj: unknown | null; erro?: string } {
  if (texto == null) return { obj: null, erro: 'Resposta vazia da LLM.' };
  let t = String(texto).trim();

  // Remove cercas de código ```json ... ``` ou ``` ... ```
  const cerca = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (cerca) t = cerca[1].trim();

  // Tenta direto
  try {
    return { obj: JSON.parse(t) };
  } catch {
    // Procura o primeiro { ... } balanceado
  }
  const inicio = t.indexOf('{');
  if (inicio === -1) return { obj: null, erro: 'Nenhum objeto JSON encontrado na resposta.' };
  let nivel = 0;
  let emString = false;
  let escape = false;
  for (let i = inicio; i < t.length; i++) {
    const c = t[i];
    if (emString) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') emString = false;
      continue;
    }
    if (c === '"') emString = true;
    else if (c === '{') nivel++;
    else if (c === '}') {
      nivel--;
      if (nivel === 0) {
        const candidato = t.slice(inicio, i + 1);
        try {
          return { obj: JSON.parse(candidato) };
        } catch (e) {
          return { obj: null, erro: `JSON malformado: ${(e as Error).message}` };
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
export function validarWorkflow(
  respostaLlm: string,
  catalogo: EntradaCatalogo[],
  nomeDesejado: string,
  opcoes: OpcoesValidacao = {},
): ResultadoValidacao {
  const erros: string[] = [];
  const avisos: string[] = [];

  const { obj, erro } = extrairJson(respostaLlm);
  if (!obj) {
    return { ok: false, erros: [erro ?? 'Falha ao extrair JSON.'], avisos };
  }

  // Caso "impossível"
  const anyObj = obj as Record<string, unknown>;
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
  const connections = (anyObj.connections ?? {}) as Conexoes;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { ok: false, erros: ['O JSON não contém a lista "nodes" com ao menos um nó.'], avisos };
  }

  const porTipo = new Map<string, EntradaCatalogo>();
  for (const c of catalogo) porTipo.set(c.type, c);

  const nomesVistos = new Set<string>();
  const nomesDuplicados = new Set<string>();
  let temGatilho = false;

  const nosSanitizados: NoWorkflow[] = [];

  for (const raw of nodes as NoWorkflow[]) {
    if (!raw || typeof raw !== 'object') {
      erros.push('Há um nó que não é um objeto válido.');
      continue;
    }
    const nome = raw.name;
    if (!nome || typeof nome !== 'string') {
      erros.push('Há um nó sem a propriedade "name".');
      continue;
    }
    if (nomesVistos.has(nome)) nomesDuplicados.add(nome);
    nomesVistos.add(nome);

    const entrada = porTipo.get(raw.type);
    if (!entrada) {
      erros.push(`O nó "${nome}" usa o tipo "${raw.type}", que não está no catálogo permitido.`);
      continue;
    }
    if (entrada.categoria === 'gatilho') temGatilho = true;

    // Parâmetros obrigatórios
    const params = (raw.parameters ?? {}) as Record<string, unknown>;
    for (const obrig of entrada.obrigatorios) {
      if (params[obrig] === undefined || params[obrig] === null || params[obrig] === '') {
        erros.push(`O nó "${nome}" (${entrada.type}) está sem o parâmetro obrigatório "${obrig}".`);
      }
    }

    // Monta nó sanitizado (remove campos proibidos; força typeVersion do catálogo)
    const limpo: NoWorkflow = {
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
      const m = (params as { model?: unknown }).model;
      if (typeof m === 'string') {
        params.model = { __rl: true, mode: 'list', value: m };
      } else if (!m || typeof m !== 'object') {
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
    const porTipoPorta = connections[origem] as Record<string, Array<Array<{ node?: string }>>>;
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
    const chainsComModelo = new Set<string>();
    for (const origem of Object.keys(connections)) {
      const portas = connections[origem] as Record<string, Array<Array<{ node?: string }>>>;
      for (const porta of portas?.ai_languageModel ?? []) {
        for (const alvo of porta ?? []) {
          if (alvo?.node) chainsComModelo.add(alvo.node);
        }
      }
    }
    if (!temModelo) {
      erros.push('Há um "Basic LLM Chain" mas falta um nó de modelo (ex.: OpenAI Chat Model) conectado a ele pela porta ai_languageModel.');
    } else {
      for (const chain of chains) {
        if (!chainsComModelo.has(chain.name)) {
          erros.push(`O nó "${chain.name}" (Basic LLM Chain) não tem um modelo conectado na porta ai_languageModel. Adicione um OpenAI Chat Model conectado a ele.`);
        }
      }
    }
  }

  // Regra: nós de ação/IA órfãos (sem entrada E sem saída) indicam fluxo incompleto.
  if (nosSanitizados.length > 1) {
    const temEntrada = new Set<string>();
    const temSaida = new Set<string>();
    for (const origem of Object.keys(connections)) {
      const portas = connections[origem] as Record<string, Array<Array<{ node?: string }>>>;
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
      if (origemTemAlgumaSaida) temSaida.add(origem);
    }
    for (const n of nosSanitizados) {
      if (porTipo.get(n.type)?.categoria === 'gatilho') continue; // gatilho não tem entrada
      if (/lmChat/i.test(n.type)) continue; // modelo de IA conecta só por ai_languageModel (já checado acima)
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
    if (!/\.if$/i.test(tiposPorNome.get(origem) ?? '')) continue;
    const portas = connections[origem] as Record<string, unknown>;
    const main = (Array.isArray(portas.main) ? portas.main : []) as unknown[];
    const mainNorm: unknown[] = [main[0] ?? [], main[1] ?? []];
    if ('true' in portas && Array.isArray((portas as Record<string, unknown>).true)) {
      mainNorm[0] = ((portas as Record<string, unknown[]>).true)[0] ?? mainNorm[0];
      delete (portas as Record<string, unknown>).true;
    }
    if ('false' in portas && Array.isArray((portas as Record<string, unknown>).false)) {
      mainNorm[1] = ((portas as Record<string, unknown[]>).false)[0] ?? mainNorm[1];
      delete (portas as Record<string, unknown>).false;
    }
    (portas as Record<string, unknown>).main = mainNorm;
  }

  // Recalcula posições (layout limpo)
  const pos = calcularPosicoes(nosSanitizados.map((n) => n.name), connections);
  for (const n of nosSanitizados) {
    n.position = pos.get(n.name) ?? [0, 300];
  }

  // Limpa campos proibidos de nível raiz implicitamente (não copiamos nada além do permitido)
  void CAMPOS_PROIBIDOS;

  const nomeFinal = `[IA] ${nomeDesejado}`.trim();
  const workflow: WorkflowSanitizado = {
    name: nomeFinal,
    nodes: nosSanitizados,
    connections,
    settings: { executionOrder: 'v1' },
  };

  const resumo = `${nosSanitizados.length} nós, ${Object.keys(connections).length} conexões de origem.`;
  return { ok: true, workflow, erros: [], avisos, resumo };
}
