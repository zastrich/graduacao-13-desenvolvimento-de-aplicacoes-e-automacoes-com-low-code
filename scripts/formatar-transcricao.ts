/**
 * formatar-transcricao.ts
 * -------------------------------------------------------------------------
 * Utilitarios para transformar o resultado bruto de `capturar-transcricoes.ts`
 * (JSON com trechos {start,end,text}) em texto Markdown legivel, ja com
 * identificacao da disciplina e do modulo, pronto para salvar em
 * `assets/transcrição/`.
 *
 * Estes helpers sao puros (nao dependem do Playwright) e podem ser usados
 * tanto pelo agente do Kiro quanto por um passo de pos-processamento.
 * -------------------------------------------------------------------------
 */

import type {
  AulaCapturada,
  ModuloCapturado,
  ResultadoCaptura,
  TrechoTranscricao,
} from './capturar-transcricoes';

/** Junta os trechos em um texto corrido, limpando espacos duplicados. */
export function trechosParaTexto(trechos: TrechoTranscricao[]): string {
  return trechos
    .map((t) => (t.text || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Formata uma unica aula em Markdown. */
export function aulaParaMarkdown(aula: AulaCapturada): string {
  const partes: string[] = [];
  partes.push(`## ${aula.ordem}. ${aula.titulo}`);
  const meta: string[] = [];
  if (aula.duracao) meta.push(`Duração: ${aula.duracao}`);
  if (aula.slug) meta.push(`Slug: \`${aula.slug}\``);
  if (aula.lessonId) meta.push(`Lesson ID: \`${aula.lessonId}\``);
  if (meta.length) partes.push(`_${meta.join(' · ')}_`);

  if (aula.erro) {
    partes.push(`> ⚠️ Transcrição não capturada (${aula.erro}).`);
  } else if (!aula.trechos.length) {
    partes.push('> Sem transcrição disponível para esta aula.');
  } else {
    partes.push(trechosParaTexto(aula.trechos));
  }
  return partes.join('\n\n');
}

/** Formata um modulo inteiro em Markdown (um arquivo por modulo). */
export function moduloParaMarkdown(
  modulo: ModuloCapturado,
  disciplina: string,
): string {
  const cabecalho = [
    `# ${disciplina}`,
    ``,
    `## Módulo ${modulo.ordem} — ${modulo.titulo}`,
    ``,
    `Total de aulas: ${modulo.totalAulas}`,
    ``,
    `---`,
    ``,
  ].join('\n');

  const corpo = modulo.aulas.map(aulaParaMarkdown).join('\n\n---\n\n');
  return cabecalho + corpo + '\n';
}

/** Gera o nome de arquivo de um modulo (kebab-case, sem acentos). */
export function nomeArquivoModulo(modulo: ModuloCapturado): string {
  const num = String(modulo.ordem).padStart(2, '0');
  const base = slugify(modulo.slug || modulo.titulo);
  return `${num}-${base}.md`;
}

/**
 * Retorna um mapa { caminhoRelativo -> conteudoMarkdown } com um arquivo por
 * modulo, para o agente gravar em `assets/transcrição/`.
 */
export function gerarArquivos(resultado: ResultadoCaptura): Record<string, string> {
  const out: Record<string, string> = {};
  for (const modulo of resultado.modulos) {
    const nome = nomeArquivoModulo(modulo);
    out[`assets/transcrição/${nome}`] = moduloParaMarkdown(modulo, resultado.disciplina);
  }
  return out;
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
