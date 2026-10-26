/** Gera um HTML de demonstração da página de revisão (determinístico, para print). */
import fs from 'node:fs';
import { gerarPreviewHtml } from './lib/preview-html.ts';

const destino = process.argv[2];
if (!destino) {
  console.error('Uso: tsx gerar-preview-demo.ts <caminho-de-saida.html>');
  process.exit(1);
}

const wf = {
  name: '[IA] Notificação Manual no Slack',
  nodes: [
    { name: 'Disparo Manual', type: 'n8n-nodes-base.manualTrigger' },
    { name: 'Definir Mensagem', type: 'n8n-nodes-base.set' },
    { name: 'Enviar Mensagem no Slack', type: 'n8n-nodes-base.slack' },
  ],
  connections: {
    'Disparo Manual': { main: [[{ node: 'Definir Mensagem' }]] },
    'Definir Mensagem': { main: [[{ node: 'Enviar Mensagem no Slack' }]] },
  },
};

const html = gerarPreviewHtml(wf, {
  rodada: 2,
  avisos: ['O nó "Enviar Mensagem no Slack" (n8n-nodes-base.slack) precisa de uma credencial configurada manualmente no n8n.'],
});

const pagina =
  '<html><head><meta charset="utf-8"><title>Revisão do Fluxo</title>' +
  '<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;color:#1a1a1a}' +
  'table{border-collapse:collapse}td{padding:4px 10px;border:1px solid #ddd}h2{color:#ea580c}h1{font-size:22px}</style></head><body>' +
  '<h1>Criador de Automações</h1>' +
  html +
  '<hr><h3>Decisão *</h3>' +
  '<label><input type="radio" name="d"> Aprovar e criar</label><br>' +
  '<label><input type="radio" name="d" checked> Ajustar</label><br>' +
  '<label><input type="radio" name="d"> Cancelar</label><br><br>' +
  '<label>Feedback para ajuste (opcional)<br><textarea rows="2" cols="50"></textarea></label><br><br>' +
  '<button style="background:#ea580c;color:#fff;border:0;padding:8px 18px;border-radius:6px;cursor:pointer">Submit</button>' +
  '</body></html>';

fs.writeFileSync(destino, pagina);
console.log('Gerado:', destino);
