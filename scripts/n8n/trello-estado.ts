/** Mostra os cards por lista do board (estado atual). Uso: tsx trello-estado.ts */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv } from './lib/env.ts';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = lerEnv(path.resolve(__dirname, '..', '.env'));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '.credenciais.json'), 'utf8'));
const auth = `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`;
const board = creds._trelloBoard.boardId;

const lists = await (await fetch(`https://api.trello.com/1/boards/${board}/lists?${auth}`)).json();
for (const l of lists) {
  const cards = await (await fetch(`https://api.trello.com/1/lists/${l.id}/cards?fields=name&${auth}`)).json();
  console.log(`\n[${l.name}] (${cards.length})`);
  for (const c of cards) console.log('  -', c.name);
}
