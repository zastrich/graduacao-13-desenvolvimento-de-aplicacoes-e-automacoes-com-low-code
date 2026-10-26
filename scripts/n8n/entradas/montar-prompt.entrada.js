// Trecho de entrada do Code node "Montar Prompt" (modo Run Once for All Items).
// Depende de: CATALOGO (constante embutida), montarPrompts (lib embutida).
// Entrada: $json com { nomeFluxo, gatilho, acoes, detalhes, feedback, errosAnteriores, tentativa }
// Saída: o mesmo estado + { systemPrompt, userPrompt }

const estado = $input.first().json;
const nosPrompt = CATALOGO.map((n) => ({
  type: n.type,
  typeVersion: n.typeVersion,
  categoria: n.categoria,
  descricao: n.descricao,
  obrigatorios: n.obrigatorios,
}));
const prompts = montarPrompts(
  {
    nomeFluxo: estado.nomeFluxo,
    gatilho: estado.gatilho,
    acoes: estado.acoes,
    detalhes: estado.detalhes,
    feedback: estado.feedback,
    errosAnteriores: Array.isArray(estado.errosAnteriores) ? estado.errosAnteriores : [],
  },
  nosPrompt,
);
return [{ json: Object.assign({}, estado, prompts) }];
