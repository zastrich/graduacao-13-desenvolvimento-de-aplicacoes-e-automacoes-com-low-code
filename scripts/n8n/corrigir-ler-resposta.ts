/** Torna o Code "Ler Resposta" tolerante a JSON com ruído. Uso: tsx corrigir-ler-resposta.ts <id> [nomeNo] */
import { criarCliente } from './lib/api.ts';

const id = process.argv[2];
const nomeNo = process.argv[3] ?? 'Ler Resposta';
if (!id) { console.error('Uso: tsx corrigir-ler-resposta.ts <workflowId> [nomeNo]'); process.exit(1); }

const JS_TOLERANTE = `// Extrai JSON da resposta da IA, tolerando cercas e texto ao redor.
const texto = String($json.text ?? $json.output ?? '');
let obj;
try {
  obj = JSON.parse(texto);
} catch (e) {
  const cerca = texto.match(/\\\`\\\`\\\`(?:json)?\\s*([\\s\\S]*?)\\\`\\\`\\\`/i);
  const corpo = cerca ? cerca[1] : texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1);
  obj = JSON.parse(corpo);
}
return [{ json: { aprovado: obj.aprovado === true, motivo: obj.motivo || '' } }];`;

const cliente = criarCliente();
const wf = (await cliente.obterWorkflow(id)) as { name: string; nodes: Array<Record<string, unknown>>; connections: unknown; settings: unknown };
const no = wf.nodes.find((n) => n.name === nomeNo);
if (!no) { console.error(`Nó "${nomeNo}" não encontrado.`); process.exit(1); }
no.parameters = { ...(no.parameters as object), jsCode: JS_TOLERANTE };

await cliente.request(`/workflows/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }),
});
console.log(`"${nomeNo}" tornado tolerante em ${id}.`);
