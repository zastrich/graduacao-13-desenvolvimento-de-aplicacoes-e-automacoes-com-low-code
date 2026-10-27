/** Submete uma reclamação ao Form Trigger de produção via POST. Uso: tsx submeter-reclamacao.ts <caso> */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv } from './lib/env.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = lerEnv(path.resolve(__dirname, '..', '.env'));
const base = (env.N8N_URL ?? 'http://localhost:5678').replace(/\/+$/, '');

// O Form Trigger mapeia os campos pelos nomes internos field-0..field-3 (ordem do form).
const casos: Record<string, Record<string, string>> = {
  // Similar a um chamado já aberto em N3 (bug de PDF), mas com outras palavras -> em_andamento
  em_andamento: {
    'field-0': 'Helena Martins',
    'field-1': 'zas+helena@code200.com.br',
    'field-2': 'Documento em PDF não é gerado',
    'field-3': 'Quando clico para gerar a fatura em formato PDF, a página dá erro e o arquivo nunca é baixado. Já tentei em outro navegador e continua.',
  },
  // Dúvida simples que a IA resolve sozinha -> resolvido (Concluído)
  resolvido: {
    'field-0': 'João Pedro Alves',
    'field-1': 'zas+joaopedro@code200.com.br',
    'field-2': 'Como mudo o idioma do aplicativo?',
    'field-3': 'Quero deixar o aplicativo em inglês mas não encontro onde trocar o idioma. Podem me orientar?',
  },
  // Caso sensível que exige pessoa -> humano (N2, prazo 48h)
  humano: {
    'field-0': 'Roberta Nunes',
    'field-1': 'zas+roberta@code200.com.br',
    'field-2': 'Fui cobrada após cancelar e quero reembolso',
    'field-3': 'Cancelei minha assinatura no mês passado e mesmo assim fui cobrada de novo. Estou muito insatisfeita e exijo o reembolso imediato.',
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
