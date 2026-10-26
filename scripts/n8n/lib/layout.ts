/**
 * Layout determinístico em camadas para posicionar nós de um workflow.
 * Calcula a profundidade de cada nó a partir dos gatilhos (BFS pelas conexões)
 * e distribui em colunas (x) e linhas (y) para um canvas limpo.
 */
export interface NoMin {
  name: string;
  type: string;
}

export type Conexoes = Record<
  string,
  { main?: Array<Array<{ node: string }>> }
>;

const PASSO_X = 260;
const PASSO_Y = 160;
const ORIGEM_X = 0;
const ORIGEM_Y = 300;

/** Nós sem nenhuma conexão de entrada (candidatos a raiz). */
function semEntrada(nomes: string[], connections: Conexoes): string[] {
  const temEntrada = new Set<string>();
  for (const origem of Object.keys(connections)) {
    const saidas = connections[origem]?.main ?? [];
    for (const porta of saidas) {
      for (const alvo of porta ?? []) {
        if (alvo?.node) temEntrada.add(alvo.node);
      }
    }
  }
  return nomes.filter((n) => !temEntrada.has(n));
}

/** Calcula a profundidade (coluna) de cada nó por BFS a partir das raízes. */
export function calcularProfundidades(
  nomes: string[],
  connections: Conexoes,
): Map<string, number> {
  const prof = new Map<string, number>();
  let raizes = semEntrada(nomes, connections);
  if (raizes.length === 0 && nomes.length > 0) raizes = [nomes[0]]; // ciclo sem raiz

  const fila: Array<{ node: string; d: number }> = raizes.map((n) => ({ node: n, d: 0 }));
  for (const r of raizes) prof.set(r, 0);

  let guard = 0;
  const maxIter = nomes.length * nomes.length + 10;
  while (fila.length > 0 && guard++ < maxIter) {
    const { node, d } = fila.shift()!;
    const saidas = connections[node]?.main ?? [];
    for (const porta of saidas) {
      for (const alvo of porta ?? []) {
        const nome = alvo?.node;
        if (!nome) continue;
        const atual = prof.get(nome);
        if (atual === undefined || d + 1 > atual) {
          prof.set(nome, d + 1);
          fila.push({ node: nome, d: d + 1 });
        }
      }
    }
  }
  // nós não alcançados (desconectados) ficam na coluna 0
  for (const n of nomes) if (!prof.has(n)) prof.set(n, 0);
  return prof;
}

/**
 * Retorna um mapa nome -> [x, y]. Nós na mesma coluna são empilhados
 * verticalmente de forma determinística (ordem de `nomes`).
 */
export function calcularPosicoes(
  nomes: string[],
  connections: Conexoes,
): Map<string, [number, number]> {
  const prof = calcularProfundidades(nomes, connections);
  const porColuna = new Map<number, string[]>();
  for (const n of nomes) {
    const c = prof.get(n) ?? 0;
    if (!porColuna.has(c)) porColuna.set(c, []);
    porColuna.get(c)!.push(n);
  }
  const pos = new Map<string, [number, number]>();
  for (const [coluna, lista] of porColuna) {
    lista.forEach((nome, i) => {
      pos.set(nome, [ORIGEM_X + coluna * PASSO_X, ORIGEM_Y + i * PASSO_Y]);
    });
  }
  return pos;
}
