/** Cria um card de bug de exemplo na lista N3 - Desenvolvimento (insumo para o caso em_andamento). */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv } from './lib/env.ts';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = lerEnv(path.resolve(__dirname, '..', '.env'));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '.credenciais.json'), 'utf8'));
const auth = `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`;
const listN3 = creds._trelloBoard.listas.n3_desenvolvimento;

const nome = 'BUG: Exportação de relatório em PDF falha';
const desc = 'Vários clientes relatam que ao exportar o relatório mensal em PDF o download falha com erro 500. Em correção pela equipe de desenvolvimento.';
const url = `https://api.trello.com/1/cards?idList=${listN3}&name=${encodeURIComponent(nome)}&desc=${encodeURIComponent(desc)}&${auth}`;
const r = await (await fetch(url, { method: 'POST' })).json();
console.log('Card criado:', r.id, '|', r.name, '| lista N3');
