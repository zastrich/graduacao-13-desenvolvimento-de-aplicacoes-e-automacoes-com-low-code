/**
 * Gera n8n/catalogo/catalogo-nos.json combinando a base curada
 * (catalogo-base.json) com os typeVersion reais da instância.
 *
 * Fonte das versões (em ordem de preferência):
 *  1. GET {N8N_URL}/types/nodes.json (normalmente 401 sem sessão do browser);
 *  2. arquivo n8n/catalogo/catalogo-versoes.json (capturado pela sessão logada).
 *
 * Imprime uma tabela tipo/versão/categoria ao final.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  carregarBase,
  mesclarVersoes,
  CAMINHO_NOS,
  CATALOGO_DIR,
} from './lib/catalogo.ts';
import { carregarConfig } from './lib/api.ts';

const CAMINHO_VERSOES = path.join(CATALOGO_DIR, 'catalogo-versoes.json');

function versaoDe(n: { defaultVersion?: number; version?: number | number[] }): number {
  if (n.defaultVersion != null) return n.defaultVersion;
  return Array.isArray(n.version) ? n.version[n.version.length - 1] : (n.version as number);
}

async function viaApi(tipos: string[]): Promise<Record<string, number> | null> {
  try {
    const { baseUrl } = carregarConfig();
    const r = await fetch(`${baseUrl.replace(/\/+$/, '')}/types/nodes.json`);
    if (!r.ok) return null;
    const data = (await r.json()) as Array<{ name: string; version?: number | number[]; defaultVersion?: number }>;
    const out: Record<string, number> = {};
    for (const t of tipos) {
      const n = data.find((x) => x.name === t);
      if (n) out[t] = versaoDe(n);
    }
    return out;
  } catch {
    return null;
  }
}

function viaArquivo(): Record<string, number> | null {
  if (!fs.existsSync(CAMINHO_VERSOES)) return null;
  return JSON.parse(fs.readFileSync(CAMINHO_VERSOES, 'utf8')) as Record<string, number>;
}

async function main(): Promise<void> {
  const base = carregarBase();
  const tipos = base.nos.map((n) => n.type);

  let versoes = await viaApi(tipos);
  let fonte = 'API /types/nodes.json';
  if (!versoes) {
    versoes = viaArquivo();
    fonte = 'arquivo catalogo-versoes.json';
  }
  if (!versoes) {
    console.error(
      'Não foi possível obter os typeVersion. Gere n8n/catalogo/catalogo-versoes.json ' +
        'executando no console do n8n (sessão logada): ' +
        "fetch('/types/nodes.json',{credentials:'include'}).",
    );
    process.exit(1);
  }

  const catalogo = mesclarVersoes(base, versoes);
  fs.writeFileSync(CAMINHO_NOS, JSON.stringify(catalogo, null, 2) + '\n');

  console.log(`Catálogo gerado (${fonte}): ${CAMINHO_NOS}`);
  console.log('');
  console.log('TIPO'.padEnd(40) + 'VERSÃO'.padEnd(10) + 'CATEGORIA');
  console.log('-'.repeat(60));
  for (const n of catalogo.nos) {
    console.log(n.type.padEnd(40) + String(n.typeVersion).padEnd(10) + n.categoria);
  }
  console.log('');
  console.log(`Total: ${catalogo.nos.length} nós.`);
}

main();
