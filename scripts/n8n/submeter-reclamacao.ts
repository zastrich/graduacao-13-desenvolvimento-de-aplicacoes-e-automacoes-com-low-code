/** Submete uma reclamação ao Form Trigger de produção via POST. Uso: tsx submeter-reclamacao.ts <caso> */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv } from './lib/env.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = lerEnv(path.resolve(__dirname, '..', '.env'));
const base = (env.N8N_URL ?? 'http://localhost:5678').replace(/\/+$/, '');

// O Form Trigger mapeia os campos pelos nomes internos field-0..field-3 (ordem do form).
const casos: Record<string, Record<string, string>> = {
  em_andamento: {
    'field-0': 'Fernanda Reis',
    'field-1': 'zas+cliente3@code200.com.br',
    'field-2': 'Erro ao exportar relatório em PDF',
    'field-3': 'Toda vez que tento baixar o relatório mensal em PDF aparece um erro e o download não completa.',
  },
  resolvido: {
    'field-0': 'Mariana Lopes',
    'field-1': 'zas+cliente1@code200.com.br',
    'field-2': 'Como altero minha senha?',
    'field-3': 'Esqueci onde fica a opção de trocar a senha no aplicativo. Podem me orientar?',
  },
  humano: {
    'field-0': 'Carlos Dias',
    'field-1': 'zas+cliente2@code200.com.br',
    'field-2': 'Pedido de reembolso não atendido',
    'field-3': 'Paguei por um plano anual mas fui cobrado em dobro. Quero o reembolso e estou insatisfeito.',
  },
};

const caso = process.argv[2] ?? 'em_andamento';
const dados = casos[caso];
if (!dados) { console.error('Caso inválido. Use: em_andamento | resolvido'); process.exit(1); }

const form = new FormData();
for (const [k, v] of Object.entries(dados)) form.append(k, v);
const resp = await fetch(`${base}/form/reclamacoes-form`, { method: 'POST', body: form });
console.log('HTTP', resp.status, resp.statusText);
console.log((await resp.text()).slice(0, 200));
