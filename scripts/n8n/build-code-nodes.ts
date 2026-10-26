/**
 * Gera os arquivos JS autossuficientes para os Code nodes do n8n a partir dos
 * fontes TypeScript testados. Cada bundle:
 *  - concatena as libs necessárias (sem imports/exports entre elas);
 *  - transpila TS -> JS (CommonJS simplificado, só o corpo das funções);
 *  - embute o catálogo como `const CATALOGO = [...]` quando necessário;
 *  - anexa o trecho de entrada ($input -> lib -> return [{ json }]).
 *
 * Saída: n8n/code/montar-prompt.js, validar-workflow.js, preview-html.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..', '..');
const LIB = path.join(__dirname, 'lib');
const ENTRADAS = path.join(__dirname, 'entradas');
const CODE_DIR = path.join(RAIZ, 'n8n', 'code');
const CATALOGO_NOS = path.join(RAIZ, 'n8n', 'catalogo', 'catalogo-nos.json');
const MAPA_CREDS = path.join(__dirname, '.credenciais.json');

/** Lê a credencial do modelo de IA (openAiApi, com fallback googlePalmApi) para injetar no validador. */
function credIAConst(): string {
  let valor = 'undefined';
  if (fs.existsSync(MAPA_CREDS)) {
    const mapa = JSON.parse(fs.readFileSync(MAPA_CREDS, 'utf8')) as Record<string, { id: string; name: string } | null>;
    const tipo = mapa.openAiApi ? 'openAiApi' : mapa.googlePalmApi ? 'googlePalmApi' : null;
    if (tipo && mapa[tipo]) valor = JSON.stringify({ tipo, id: mapa[tipo]!.id, name: mapa[tipo]!.name });
  }
  return `const CRED_IA = ${valor};`;
}

/** Remove linhas de import e as palavras-chave export (mantém o corpo). */
function limparModulo(src: string): string {
  return src
    .split(/\r?\n/)
    .filter((l) => !/^\s*import\s/.test(l))
    .join('\n')
    .replace(/^\s*export\s+(?=(interface|type|function|const|class|async))/gm, '')
    .replace(/^\s*export\s+\{[^}]*\};?\s*$/gm, '');
}

/** Transpila TS -> JS removendo tipos. */
function transpilar(src: string): string {
  const out = ts.transpileModule(src, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      removeComments: false,
    },
  });
  return out.outputText;
}

function lerLib(nome: string): string {
  return limparModulo(fs.readFileSync(path.join(LIB, `${nome}.ts`), 'utf8'));
}

function lerEntrada(nome: string): string {
  return fs.readFileSync(path.join(ENTRADAS, `${nome}.entrada.js`), 'utf8');
}

function catalogoConst(): string {
  const cat = JSON.parse(fs.readFileSync(CATALOGO_NOS, 'utf8')) as {
    nos: Array<Record<string, unknown>>;
  };
  const enxuto = cat.nos.map((n) => ({
    type: n.type,
    typeVersion: n.typeVersion,
    categoria: n.categoria,
    descricao: n.descricao,
    obrigatorios: n.obrigatorios,
  }));
  return `const CATALOGO = ${JSON.stringify(enxuto, null, 2)};`;
}

interface Bundle {
  saida: string;
  libs: string[];
  entrada: string;
  usaCatalogo: boolean;
  injetaCredIA?: boolean;
}

const BUNDLES: Bundle[] = [
  { saida: 'montar-prompt.js', libs: ['montar-prompt'], entrada: 'montar-prompt', usaCatalogo: true },
  { saida: 'validar-workflow.js', libs: ['uuid', 'layout', 'validar-workflow'], entrada: 'validar-workflow', usaCatalogo: true, injetaCredIA: true },
  { saida: 'preview-html.js', libs: ['layout', 'preview-html'], entrada: 'preview-html', usaCatalogo: false },
];

function montarBundle(b: Bundle): string {
  const corpoLibs = b.libs.map(lerLib).join('\n\n');
  const jsLibs = transpilar(corpoLibs);
  const partes: string[] = [
    '// ===== ARQUIVO GERADO por scripts/n8n/build-code-nodes.ts — não edite à mão =====',
    "// Code node (Run Once for All Items). Sem require/process/$env.",
    '',
  ];
  if (b.usaCatalogo) partes.push(catalogoConst(), '');
  if (b.injetaCredIA) partes.push(credIAConst(), '');
  partes.push('// --- libs ---', jsLibs, '', '// --- entrada ---', lerEntrada(b.entrada));
  return partes.join('\n');
}

function main(): void {
  fs.mkdirSync(CODE_DIR, { recursive: true });
  for (const b of BUNDLES) {
    const conteudo = montarBundle(b);
    const destino = path.join(CODE_DIR, b.saida);
    fs.writeFileSync(destino, conteudo);
    console.log(`Gerado: n8n/code/${b.saida} (${conteudo.length} chars)`);
  }
  console.log('Build dos Code nodes concluído.');
}

main();
