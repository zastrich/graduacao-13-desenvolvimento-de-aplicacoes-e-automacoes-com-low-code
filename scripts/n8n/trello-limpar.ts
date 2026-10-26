/** Arquiva todos os cards do board (limpeza para re-teste). Uso: tsx trello-limpar.ts */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv } from './lib/env.ts';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = lerEnv(path.resolve(__dirname, '..', '.env'));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '.credenciais.json'), 'utf8'));
const auth = `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`;
const board = creds._trelloBoard.boardId;

const cards = await (await fetch(`https://api.trello.com/1/boards/${board}/cards?fields=name&${auth}`)).json();
for (const c of cards) {
  await fetch(`https://api.trello.com/1/cards/${c.id}?closed=true&${auth}`, { method: 'PUT' });
  console.log('arquivado:', c.name);
}
console.log(`\nTotal: ${cards.length} cards arquivados.`);
