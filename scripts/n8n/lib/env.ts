import fs from 'node:fs';

/**
 * Parser de arquivos .env sem dependências externas.
 *
 * Regras suportadas:
 * - `CHAVE=valor`
 * - linhas em branco e comentários (`#`) são ignorados
 * - `#` fora de aspas inicia um comentário no fim da linha
 * - valores podem ser envolvidos por aspas simples ou duplas (as aspas são removidas)
 * - espaços ao redor da chave e do valor (não entre aspas) são removidos
 * - prefixo opcional `export ` é aceito e descartado
 */
export function parseEnv(conteudo: string): Record<string, string> {
  const resultado: Record<string, string> = {};
  const linhas = conteudo.split(/\r?\n/);

  for (const linhaBruta of linhas) {
    let linha = linhaBruta.trim();
    if (linha === '' || linha.startsWith('#')) continue;

    if (linha.startsWith('export ')) {
      linha = linha.slice('export '.length).trim();
    }

    const igual = linha.indexOf('=');
    if (igual === -1) continue;

    const chave = linha.slice(0, igual).trim();
    if (chave === '') continue;

    let valor = linha.slice(igual + 1).trim();
    valor = extrairValor(valor);
    resultado[chave] = valor;
  }

  return resultado;
}

function extrairValor(bruto: string): string {
  if (bruto === '') return '';

  const aspa = bruto[0];
  if (aspa === '"' || aspa === "'") {
    // Valor entre aspas: pega até a próxima aspa igual; preserva o conteúdo literal.
    const fim = bruto.indexOf(aspa, 1);
    if (fim !== -1) {
      return bruto.slice(1, fim);
    }
    // Aspa de abertura sem fechamento: devolve o restante sem a aspa.
    return bruto.slice(1);
  }

  // Sem aspas: um `#` inicia comentário no fim da linha.
  const comentario = bruto.indexOf(' #');
  if (comentario !== -1) {
    return bruto.slice(0, comentario).trim();
  }
  return bruto;
}

/** Lê e faz o parse de um arquivo .env. Retorna {} se o arquivo não existir. */
export function lerEnv(caminho: string): Record<string, string> {
  if (!fs.existsSync(caminho)) return {};
  return parseEnv(fs.readFileSync(caminho, 'utf8'));
}

/**
 * Obtém uma variável obrigatória de um mapa já lido (ex.: process.env ou lerEnv()).
 * Lança um erro claro quando ausente ou vazia.
 */
export function obrigatorio(
  mapa: Record<string, string | undefined>,
  chave: string,
  dica?: string,
): string {
  const valor = mapa[chave];
  if (valor === undefined || valor.trim() === '') {
    const sufixo = dica ? ` ${dica}` : '';
    throw new Error(`Variável obrigatória ausente: ${chave}.${sufixo}`);
  }
  return valor;
}
