// ===== ARQUIVO GERADO por scripts/n8n/build-code-nodes.ts — não edite à mão =====
// Code node (Run Once for All Items). Sem require/process/$env.

// --- libs ---
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
/** Escapa HTML para evitar injeção a partir de conteúdo da LLM. */
function escaparHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
/** Nome "amigável" do tipo (última parte após o ponto). */
function tipoCurto(type) {
    const p = type.split('.');
    return p[p.length - 1] || type;
}
/** Monta as sequências "A → B → C" seguindo as conexões a partir das raízes. */
function montarSequencias(nodes, connections) {
    const nomes = nodes.map((n) => n.name);
    const temEntrada = new Set();
    for (const origem of Object.keys(connections)) {
        for (const porta of connections[origem]?.main ?? []) {
            for (const alvo of porta ?? [])
                if (alvo?.node)
                    temEntrada.add(alvo.node);
        }
    }
    const raizes = nomes.filter((n) => !temEntrada.has(n));
    const sequencias = [];
    const visitar = (atual, caminho) => {
        const novoCaminho = [...caminho, atual];
        const saidas = connections[atual]?.main ?? [];
        const alvos = [];
        for (const porta of saidas) {
            for (const alvo of porta ?? [])
                if (alvo?.node)
                    alvos.push(alvo.node);
        }
        if (alvos.length === 0) {
            sequencias.push(novoCaminho.join(' → '));
            return;
        }
        // evita loop infinito: não revisita nó já no caminho
        for (const alvo of alvos) {
            if (novoCaminho.includes(alvo)) {
                sequencias.push([...novoCaminho, `${alvo} (↩ volta)`].join(' → '));
            }
            else {
                visitar(alvo, novoCaminho);
            }
        }
    };
    for (const r of raizes.length ? raizes : nomes.slice(0, 1))
        visitar(r, []);
    return sequencias;
}
function gerarPreviewHtml(wf, opcoes = {}) {
    const linhas = wf.nodes
        .map((n) => `<tr><td>${escaparHtml(n.name)}</td><td>${escaparHtml(tipoCurto(n.type))}</td></tr>`)
        .join('');
    const sequencias = montarSequencias(wf.nodes, wf.connections)
        .map((s) => `<li>${escaparHtml(s)}</li>`)
        .join('');
    const avisosHtml = opcoes.avisos && opcoes.avisos.length
        ? `<div><strong>Avisos:</strong><ul>${opcoes.avisos
            .map((a) => `<li>${escaparHtml(a)}</li>`)
            .join('')}</ul></div>`
        : '';
    const rodadaHtml = opcoes.rodada
        ? `<p><em>Rodada ${escaparHtml(opcoes.rodada)}</em></p>`
        : '';
    return [
        '<div>',
        `<h2>Pré-visualização: ${escaparHtml(wf.name)}</h2>`,
        rodadaHtml,
        `<p>${escaparHtml(wf.nodes.length)} nó(s).</p>`,
        '<h3>Nós</h3>',
        '<table border="1" cellpadding="4" cellspacing="0">',
        '<tr><td><strong>Nó</strong></td><td><strong>Tipo</strong></td></tr>',
        linhas,
        '</table>',
        '<h3>Fluxo</h3>',
        `<ul>${sequencias}</ul>`,
        avisosHtml,
        '</div>',
    ]
        .filter(Boolean)
        .join('\n');
}


// --- entrada ---
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
