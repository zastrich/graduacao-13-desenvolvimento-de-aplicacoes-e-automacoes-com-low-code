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
