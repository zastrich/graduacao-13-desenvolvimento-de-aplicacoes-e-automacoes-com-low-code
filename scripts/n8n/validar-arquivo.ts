/**
 * Valida um arquivo contendo a resposta crua da LLM (texto ou JSON) e imprime
 * o resultado + o workflow sanitizado.
 * Uso: tsx validar-arquivo.ts <arquivo> [nome do fluxo]
 */
import fs from 'node:fs';
import { carregarCatalogo } from './lib/catalogo.ts';
import { validarWorkflow, type EntradaCatalogo } from './lib/validar-workflow.ts';

const arquivo = process.argv[2];
const nome = process.argv[3] ?? 'Fluxo de Teste';
if (!arquivo) {
  console.error('Uso: tsx validar-arquivo.ts <arquivo> [nome do fluxo]');
  process.exit(1);
}

const texto = fs.readFileSync(arquivo, 'utf8');
const catalogo = carregarCatalogo().nos.map(
  (n): EntradaCatalogo => ({
    type: n.type,
    typeVersion: n.typeVersion,
    categoria: n.categoria,
    obrigatorios: n.obrigatorios,
  }),
);

const r = validarWorkflow(texto, catalogo, nome);
console.log('ok:', r.ok);
if (r.impossivel) console.log('impossível:', r.motivo);
if (r.erros.length) console.log('erros:\n - ' + r.erros.join('\n - '));
if (r.avisos.length) console.log('avisos:\n - ' + r.avisos.join('\n - '));
if (r.workflow) {
  console.log('resumo:', r.resumo);
  console.log(JSON.stringify(r.workflow, null, 2));
}
