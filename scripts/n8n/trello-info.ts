/**
 * Valida a credencial do Trello e extrai os IDs do board e das listas.
 * Lê TRELLO_API_KEY / TRELLO_TOKEN / TRELLO_BOARD_ID de scripts/.env.
 *
 * Uso: tsx trello-info.ts
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv } from './lib/env.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = lerEnv(path.resolve(__dirname, '..', '.env'));
const key = env.TRELLO_API_KEY;
const token = env.TRELLO_TOKEN;
const boardShort = env.TRELLO_BOARD_ID; // short link (ex.: 5zoqg2e0)
if (!key || !token) { console.error('Faltam TRELLO_API_KEY/TRELLO_TOKEN no .env'); process.exit(1); }

const auth = `key=${key}&token=${token}`;

// 1) membro (valida credencial)
const me = await (await fetch(`https://api.trello.com/1/members/me?${auth}`)).json();
console.log('Autenticado como:', me.username, '('+me.fullName+')');

// 2) board pelo short link
const board = await (await fetch(`https://api.trello.com/1/boards/${boardShort}?${auth}`)).json();
console.log('Board:', board.name, 'id=', board.id);

// 3) listas do board
const lists = await (await fetch(`https://api.trello.com/1/boards/${board.id}/lists?${auth}`)).json();
console.log('\nListas:');
for (const l of lists) console.log(`- ${l.name} | id=${l.id}`);

// 4) resumo em JSON para o fluxo
const mapa: Record<string, string> = { _boardId: board.id };
for (const l of lists) mapa[l.name] = l.id;
console.log('\nJSON:', JSON.stringify(mapa, null, 2));
