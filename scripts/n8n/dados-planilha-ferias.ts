/**
 * Fonte única dos dados da planilha de férias (colaboradores + histórico).
 * Todos os e-mails seguem o padrão zas+[ALIAS]@code200.com.br (inclui gestores).
 *
 * Uso:
 *   tsx dados-planilha-ferias.ts colaboradores   -> imprime TSV e copia p/ clipboard
 *   tsx dados-planilha-ferias.ts ferias          -> idem
 *   tsx dados-planilha-ferias.ts                 -> imprime ambos (sem clipboard)
 */
import { execSync } from 'node:child_process';

const EMAIL = (alias: string) => `zas+${alias}@code200.com.br`;

// Gestores (também recebem e-mail no padrão)
const GESTORES = {
  carlos: { nome: 'Carlos Souza', alias: 'carlos' },
  ana: { nome: 'Ana Lima', alias: 'ana' },
};

export interface Colaborador {
  matricula: string;
  nome: string;
  alias: string;
  gestorKey: keyof typeof GESTORES;
  dataAdmissao: string;
  saldoDias: number;
}

export const COLABORADORES: Colaborador[] = [
  { matricula: '123', nome: 'João Silva', alias: 'joao', gestorKey: 'carlos', dataAdmissao: '2020-01-01', saldoDias: 20 },
  { matricula: '456', nome: 'Maria Oliveira', alias: 'maria', gestorKey: 'carlos', dataAdmissao: '2022-06-15', saldoDias: 12 },
  { matricula: '789', nome: 'Pedro Santos', alias: 'pedro', gestorKey: 'ana', dataAdmissao: '2019-03-10', saldoDias: 8 },
  { matricula: '234', nome: 'Ana Costa', alias: 'anacosta', gestorKey: 'carlos', dataAdmissao: '2018-09-20', saldoDias: 30 },
  { matricula: '345', nome: 'Bruno Almeida', alias: 'bruno', gestorKey: 'ana', dataAdmissao: '2021-02-01', saldoDias: 15 },
  { matricula: '567', nome: 'Carla Mendes', alias: 'carla', gestorKey: 'carlos', dataAdmissao: '2023-01-10', saldoDias: 25 },
  { matricula: '678', nome: 'Diego Ferreira', alias: 'diego', gestorKey: 'ana', dataAdmissao: '2017-11-05', saldoDias: 18 },
  { matricula: '890', nome: 'Elena Rocha', alias: 'elena', gestorKey: 'carlos', dataAdmissao: '2020-07-22', saldoDias: 22 },
];

// Histórico de férias já concedidas (datas passadas em relação a 2026)
export const FERIAS = [
  { matricula: '123', inicio: '2023-10-01', fim: '2023-10-10', dias: 10 },
  { matricula: '123', inicio: '2024-07-01', fim: '2024-07-15', dias: 15 },
  { matricula: '456', inicio: '2024-01-05', fim: '2024-01-19', dias: 15 },
  { matricula: '789', inicio: '2023-12-01', fim: '2023-12-10', dias: 10 },
  { matricula: '234', inicio: '2024-03-01', fim: '2024-03-20', dias: 20 },
  { matricula: '234', inicio: '2025-02-10', fim: '2025-02-24', dias: 15 },
  { matricula: '345', inicio: '2024-11-01', fim: '2024-11-10', dias: 10 },
  { matricula: '567', inicio: '2025-01-15', fim: '2025-01-29', dias: 15 },
  { matricula: '678', inicio: '2023-08-01', fim: '2023-08-30', dias: 30 },
  { matricula: '678', inicio: '2024-09-02', fim: '2024-09-16', dias: 15 },
  { matricula: '890', inicio: '2024-05-05', fim: '2024-05-19', dias: 15 },
];

export function tsvColaboradores(): string {
  const header = ['matricula', 'nome', 'email', 'gestor', 'emailGestor', 'dataAdmissao', 'saldoDias'];
  const linhas = COLABORADORES.map((c) => {
    const g = GESTORES[c.gestorKey];
    return [c.matricula, c.nome, EMAIL(c.alias), g.nome, EMAIL(g.alias), c.dataAdmissao, String(c.saldoDias)];
  });
  return [header, ...linhas].map((l) => l.join('\t')).join('\n');
}

export function tsvFerias(): string {
  const header = ['matricula', 'inicio', 'fim', 'dias'];
  const linhas = FERIAS.map((f) => [f.matricula, f.inicio, f.fim, String(f.dias)]);
  return [header, ...linhas].map((l) => l.join('\t')).join('\n');
}

function main(): void {
  const alvo = process.argv[2];
  if (alvo === 'colaboradores' || alvo === 'ferias') {
    const tsv = alvo === 'colaboradores' ? tsvColaboradores() : tsvFerias();
    execSync('clip', { input: Buffer.from(tsv, 'utf8') });
    console.log(tsv);
    console.error(`\n[${alvo}] copiado para o clipboard.`);
  } else {
    console.log('=== colaboradores ===');
    console.log(tsvColaboradores());
    console.log('\n=== ferias ===');
    console.log(tsvFerias());
  }
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
