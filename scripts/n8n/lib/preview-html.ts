/**
 * Gera o HTML de pré-visualização do workflow para a página de revisão do Form.
 * HTML estático (sem <script>, <style>, <input>), compatível com o Custom HTML
 * do n8n Form. Todo conteúdo vindo da LLM é escapado.
 */
import type { Conexoes } from './layout.ts';

export interface NoPreview {
  name: string;
  type: string;
}

export interface WorkflowPreview {
  name: string;
  nodes: NoPreview[];
  connections: Conexoes;
}

/** Escapa HTML para evitar injeção a partir de conteúdo da LLM. */
export function escaparHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Nome "amigável" do tipo (última parte após o ponto). */
export function tipoCurto(type: string): string {
  const p = type.split('.');
  return p[p.length - 1] || type;
}

/** Monta as sequências "A → B → C" seguindo as conexões a partir das raízes. */
export function montarSequencias(nodes: NoPreview[], connections: Conexoes): string[] {
  const nomes = nodes.map((n) => n.name);
  const temEntrada = new Set<string>();
  for (const origem of Object.keys(connections)) {
    for (const porta of connections[origem]?.main ?? []) {
      for (const alvo of porta ?? []) if (alvo?.node) temEntrada.add(alvo.node);
    }
  }
  const raizes = nomes.filter((n) => !temEntrada.has(n));
  const sequencias: string[] = [];

  const visitar = (atual: string, caminho: string[]): void => {
    const novoCaminho = [...caminho, atual];
    const saidas = connections[atual]?.main ?? [];
    const alvos: string[] = [];
    for (const porta of saidas) {
      for (const alvo of porta ?? []) if (alvo?.node) alvos.push(alvo.node);
    }
    if (alvos.length === 0) {
      sequencias.push(novoCaminho.join(' → '));
      return;
    }
    // evita loop infinito: não revisita nó já no caminho
    for (const alvo of alvos) {
      if (novoCaminho.includes(alvo)) {
        sequencias.push([...novoCaminho, `${alvo} (↩ volta)`].join(' → '));
      } else {
        visitar(alvo, novoCaminho);
      }
    }
  };

  for (const r of raizes.length ? raizes : nomes.slice(0, 1)) visitar(r, []);
  return sequencias;
}

export function gerarPreviewHtml(
  wf: WorkflowPreview,
  opcoes: { rodada?: number; avisos?: string[] } = {},
): string {
  const linhas = wf.nodes
    .map(
      (n) =>
        `<tr><td>${escaparHtml(n.name)}</td><td>${escaparHtml(tipoCurto(n.type))}</td></tr>`,
    )
    .join('');

  const sequencias = montarSequencias(wf.nodes, wf.connections)
    .map((s) => `<li>${escaparHtml(s)}</li>`)
    .join('');

  const avisosHtml =
    opcoes.avisos && opcoes.avisos.length
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
