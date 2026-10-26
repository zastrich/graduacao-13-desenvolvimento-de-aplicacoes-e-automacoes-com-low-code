/** Mostra os comentários de um card. Uso: tsx ver-comentarios-card.ts <cardId> */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv } from './lib/env.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = lerEnv(path.resolve(__dirname, '..', '.env'));
const auth = `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`;
const cardId = process.argv[2];

const acts = await (await fetch(`https://api.trello.com/1/cards/${cardId}/actions?filter=commentCard&${auth}`)).json();
for (const a of acts) {
  console.log('--- comentário ---');
  console.log(a.data.text);
}
if (!acts.length) console.log('(sem comentários)');
