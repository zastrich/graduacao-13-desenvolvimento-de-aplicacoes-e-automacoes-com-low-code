/**
 * Cria cards de exemplo (reclamações fictícias de clientes) na lista
 * N1 - Atendimento Chatbot, para compor o fundo do vídeo pitch.
 *
 * Uso: tsx popular-trello-demo.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv } from './lib/env.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = lerEnv(path.resolve(__dirname, '..', '.env'));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '.credenciais.json'), 'utf8'));
const auth = `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`;
const listN1 = creds._trelloBoard.listas.n1_chatbot;

const CARDS: Array<{ nome: string; nome_cliente: string; email: string; descricao: string }> = [
  { nome: 'App trava ao abrir o relatório mensal', nome_cliente: 'Mariana Lopes', email: 'mariana.lopes@gmail.com', descricao: 'Toda vez que abro o relatório mensal o aplicativo congela e preciso fechar e abrir de novo.' },
  { nome: 'Não consigo redefinir minha senha', nome_cliente: 'Bruno Carvalho', email: 'bruno.carvalho@hotmail.com', descricao: 'Cliquei em "esqueci a senha" mas o e-mail de redefinição nunca chega.' },
  { nome: 'Cobrança duplicada no cartão', nome_cliente: 'Patrícia Nunes', email: 'patricia.nunes@outlook.com', descricao: 'Fui cobrada duas vezes pelo plano deste mês. Preciso do estorno de uma das cobranças.' },
  { nome: 'Exportação em PDF retorna erro', nome_cliente: 'Rafael Teixeira', email: 'rafael.teixeira@gmail.com', descricao: 'Ao exportar a nota em PDF aparece um erro e o download não completa.' },
  { nome: 'Dúvida sobre upgrade de plano', nome_cliente: 'Camila Duarte', email: 'camila.duarte@gmail.com', descricao: 'Quero entender a diferença entre o plano Pro e o Business antes de fazer o upgrade.' },
  { nome: 'Integração com o WhatsApp parou', nome_cliente: 'Thiago Moreira', email: 'thiago.moreira@empresa.com.br', descricao: 'As mensagens automáticas pelo WhatsApp pararam de ser enviadas desde ontem.' },
  { nome: 'Pedido de cancelamento de assinatura', nome_cliente: 'Luiza Fernandes', email: 'luiza.fernandes@gmail.com', descricao: 'Gostaria de cancelar minha assinatura e saber se há reembolso proporcional.' },
  { nome: 'Relatório mostra dados desatualizados', nome_cliente: 'Gustavo Ramos', email: 'gustavo.ramos@yahoo.com.br', descricao: 'Os números do dashboard não batem com os dados reais; parece que não atualiza.' },
  { nome: 'Não recebo as notificações por e-mail', nome_cliente: 'Aline Barbosa', email: 'aline.barbosa@gmail.com', descricao: 'Configurei os alertas por e-mail mas não estou recebendo nenhuma notificação.' },
  { nome: 'Como adiciono um novo usuário à conta?', nome_cliente: 'Eduardo Pires', email: 'eduardo.pires@startup.io', descricao: 'Preciso dar acesso a um colega de equipe mas não encontro onde convidar usuários.' },
  { nome: 'Lentidão para carregar a tela inicial', nome_cliente: 'Fernanda Castro', email: 'fernanda.castro@gmail.com', descricao: 'A tela inicial demora muito para carregar, às vezes mais de 30 segundos.' },
  { nome: 'Fatura não disponível para download', nome_cliente: 'Marcelo Antunes', email: 'marcelo.antunes@gmail.com', descricao: 'A fatura do mês passado não aparece para download na área financeira.' },
];

async function main(): Promise<void> {
  let n = 0;
  for (const c of CARDS) {
    const desc = `Reclamação de ${c.nome_cliente} (${c.email}):\n\n${c.descricao}`;
    const url = `https://api.trello.com/1/cards?idList=${listN1}&name=${encodeURIComponent(c.nome)}&desc=${encodeURIComponent(desc)}&pos=bottom&${auth}`;
    const resp = await fetch(url, { method: 'POST' });
    if (!resp.ok) { console.error(`FALHA "${c.nome}": HTTP ${resp.status}`, (await resp.text()).slice(0, 150)); process.exit(1); }
    const card = await resp.json();
    n++;
    console.log(`OK ${n}. ${card.name}`);
  }
  console.log(`\n${n} cards criados na lista N1 - Atendimento Chatbot.`);
}

main().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
