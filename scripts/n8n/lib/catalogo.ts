import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/n8n/lib/ -> raiz do projeto
const RAIZ = path.resolve(__dirname, '..', '..', '..');
export const CATALOGO_DIR = path.join(RAIZ, 'n8n', 'catalogo');
export const CAMINHO_BASE = path.join(CATALOGO_DIR, 'catalogo-base.json');
export const CAMINHO_NOS = path.join(CATALOGO_DIR, 'catalogo-nos.json');

export type Categoria = 'gatilho' | 'acao' | 'ia';

export interface NoBase {
  type: string;
  displayName: string;
  categoria: Categoria;
  descricao: string;
  obrigatorios: string[];
  exemplo: Record<string, unknown>;
  precisaCredencial: boolean;
}

export interface NoCatalogo extends NoBase {
  typeVersion: number;
}

export interface CatalogoBase {
  descricao: string;
  nos: NoBase[];
}

export interface Catalogo {
  descricao: string;
  geradoEm: string;
  nos: NoCatalogo[];
}

export function carregarBase(caminho: string = CAMINHO_BASE): CatalogoBase {
  return JSON.parse(fs.readFileSync(caminho, 'utf8')) as CatalogoBase;
}

export function carregarCatalogo(caminho: string = CAMINHO_NOS): Catalogo {
  if (!fs.existsSync(caminho)) {
    throw new Error(
      `Catálogo não gerado: ${caminho}. Rode: npm run n8n:catalogo (requer a instância no ar).`,
    );
  }
  return JSON.parse(fs.readFileSync(caminho, 'utf8')) as Catalogo;
}

/**
 * Combina a base curada com o mapa de versões reais da instância.
 * Lança erro se algum nó da base não tiver versão correspondente.
 */
export function mesclarVersoes(
  base: CatalogoBase,
  versoes: Record<string, number>,
): Catalogo {
  const semVersao: string[] = [];
  const nos: NoCatalogo[] = base.nos.map((n) => {
    const v = versoes[n.type];
    if (v == null) semVersao.push(n.type);
    return { ...n, typeVersion: v as number };
  });
  if (semVersao.length > 0) {
    throw new Error(`Sem typeVersion para: ${semVersao.join(', ')}`);
  }
  return { descricao: base.descricao, geradoEm: new Date().toISOString(), nos };
}

/** Índice type -> NoCatalogo para consultas rápidas no validador. */
export function indexar(catalogo: Catalogo): Map<string, NoCatalogo> {
  const m = new Map<string, NoCatalogo>();
  for (const n of catalogo.nos) m.set(n.type, n);
  return m;
}

export function gatilhos(catalogo: Catalogo): NoCatalogo[] {
  return catalogo.nos.filter((n) => n.categoria === 'gatilho');
}
