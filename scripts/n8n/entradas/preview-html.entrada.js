// Trecho de entrada do Code node "Pré-visualização" (Run Once for All Items).
// Depende de: gerarPreviewHtml (lib embutida).
// Entrada: $json com { workflow, tentativa/rodada, avisos }
// Saída: { previewHtml, workflow }

const item = $input.first().json;
const workflow = item.workflow;
if (!workflow) {
  return [{ json: { previewHtml: '<div><h2>Sem workflow para pré-visualizar.</h2></div>', workflow: null } }];
}
// A rodada vem do estado do Criador (Nova Rodada tem prioridade sobre Estado).
// Em uso isolado (fora do Criador), cai para o campo do próprio item.
let rodada = item.rodada || item.tentativa || 1;
try { rodada = $('Nova Rodada').last().json.rodada || rodada; }
catch (e) {
  try { rodada = $('Estado').last().json.rodada || rodada; } catch (e2) { /* uso isolado */ }
}
const avisos = Array.isArray(item.avisos) ? item.avisos : [];
const previewHtml = gerarPreviewHtml(
  { name: workflow.name, nodes: workflow.nodes, connections: workflow.connections },
  { rodada, avisos },
);
return [{ json: { previewHtml, workflow } }];
