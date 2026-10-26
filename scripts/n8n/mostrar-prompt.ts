/**
 * Imprime o System e o User Prompt para um pedido (arquivo JSON do estado).
 * Uso: tsx mostrar-prompt.ts <arquivo-pedido.json>
 */
import fs from 'node:fs';
import { carregarCatalogo } from './lib/catalogo.ts';
import { montarPrompts, type EstadoPedido, type NoCatalogoPrompt } from './lib/montar-prompt.ts';

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Uso: tsx mostrar-prompt.ts <arquivo-pedido.json>');
  process.exit(1);
}

const estado = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as EstadoPedido;
const nos = carregarCatalogo().nos.map(
  (n): NoCatalogoPrompt => ({
    type: n.type,
    typeVersion: n.typeVersion,
    categoria: n.categoria,
    descricao: n.descricao,
    obrigatorios: n.obrigatorios,
  }),
);

const { systemPrompt, userPrompt } = montarPrompts(estado, nos);
console.log('===== SYSTEM PROMPT =====');
console.log(systemPrompt);
console.log('\n===== USER PROMPT =====');
console.log(userPrompt);
