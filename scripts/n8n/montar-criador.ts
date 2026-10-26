/**
 * Task 9 — monta/atualiza o workflow [Meta] Criador Automático de Fluxos via LLM.
 *
 * Form Trigger (Basic Auth) -> Estado (rodada=1)
 *   -> Chamar Núcleo (Execute Sub-workflow) -> ok?
 *        não -> Fim: Falha (Form Ending)
 *        sim -> Pré-visualização (Code) -> Revisão (Form) -> Decisão (Switch)
 *                 Aprovar  -> Criar Workflow (n8n) -> Fim: Sucesso (Form Ending, link)
 *                              (erro) -> Nova Rodada
 *                 Ajustar  -> Nova Rodada (Set) -> dentro do limite? (If)
 *                               sim -> Chamar Núcleo (loop)
 *                               não -> Fim: Limite (Form Ending)
 *                 Cancelar -> Fim: Cancelado (Form Ending)
 *
 * Requer: Núcleo criado (manifesto) e credenciais (.credenciais.json com httpBasicAuth e n8nApi).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from './lib/api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..', '..');
const CODE_DIR = path.join(RAIZ, 'n8n', 'code');
const MANIFESTO = path.join(RAIZ, 'n8n', 'workflows', 'manifesto.json');
const MAPA_CREDS = path.join(__dirname, '.credenciais.json');

const NOME = '[Meta] Criador Automático de Fluxos via LLM';

const V = {
  formTrigger: 2.6,
  form: 2.5,
  set: 3.5,
  code: 2,
  if: 2.3,
  switch: 3.4,
  executeWorkflow: 1.4,
  n8n: 1,
};

function code(nome: string): string {
  return fs.readFileSync(path.join(CODE_DIR, nome), 'utf8');
}
function pos(x: number, y: number): [number, number] {
  return [x, y];
}
function setA(id: string, nome: string, valor: string, tipo = 'string') {
  return { id, name: nome, value: valor, type: tipo };
}
function creds(): Record<string, { id: string; name: string } | null> {
  return fs.existsSync(MAPA_CREDS) ? JSON.parse(fs.readFileSync(MAPA_CREDS, 'utf8')) : {};
}
function nucleoId(): string {
  const m: Array<{ id: string; arquivo: string }> = JSON.parse(fs.readFileSync(MANIFESTO, 'utf8'));
  const n = m.find((x) => x.arquivo === 'nucleo-gerador.json');
  if (!n) throw new Error('Núcleo não encontrado no manifesto. Rode montar-nucleo.ts primeiro.');
  return n.id;
}

function condIgual(id: string, left: string, right: string) {
  return {
    options: { caseSensitive: true, typeValidation: 'loose', version: 2 },
    conditions: [{ id, leftValue: left, rightValue: right, operator: { type: 'string', operation: 'equals' } }],
    combinator: 'and',
  };
}

function build() {
  const cr = creds();
  // O Basic Auth no Form Trigger quebra o submit AJAX do cliente no navegador
  // (o fetch do app Vue não reenvia as credenciais da URL). Mantido desligado por
  // padrão para o form funcionar pelo navegador; pode ser religado via BASIC_AUTH=1.
  const usarBasic = process.env.BASIC_AUTH === '1';
  const credBasic = usarBasic && cr.httpBasicAuth ? { httpBasicAuth: { id: cr.httpBasicAuth.id, name: cr.httpBasicAuth.name } } : undefined;
  const credN8n = cr.n8nApi ? { n8nApi: { id: cr.n8nApi.id, name: cr.n8nApi.name } } : undefined;
  const credN8nHeader = cr.n8nApiHeader ? { httpHeaderAuth: { id: cr.n8nApiHeader.id, name: cr.n8nApiHeader.name } } : undefined;
  const nucleo = nucleoId();

  const nodes: Array<Record<string, unknown>> = [
    {
      parameters: {
        ...(credBasic ? { authentication: 'basicAuth' } : {}),
        formTitle: 'Criador de Automações',
        formDescription:
          'Descreva a automação em etapas claras. Quanto mais específico, melhor o fluxo gerado. Siga o guia de cada campo abaixo.',
        formFields: {
          values: [
            {
              fieldType: 'html',
              elementName: 'guia',
              html:
                '<div style="border:1px solid #ddd;border-radius:8px;padding:12px;background:#fafafa">' +
                '<strong>Como descrever um bom fluxo (passo a passo):</strong>' +
                '<ol style="margin:8px 0 0 18px;padding:0">' +
                '<li><b>Dados de entrada:</b> liste os dados que serão coletados do usuário (ex.: matrícula, data de início, data de fim).</li>' +
                '<li><b>Fontes de validação:</b> diga onde os dados serão consultados/validados (ex.: planilha com abas "colaboradores" e "ferias"). Para teste, uma base CSV de exemplo é embutida.</li>' +
                '<li><b>Regras de validação:</b> descreva cada regra, uma por linha (ex.: antecedência mínima de 30 dias; mínimo de 5 dias; não exceder o saldo).</li>' +
                '<li><b>Etapas do processo:</b> descreva o passo a passo (ex.: validar → se reprovado avisar o colaborador → se aprovado pedir aprovação do gestor → registrar → notificar).</li>' +
                '<li><b>Aprovações e notificações:</b> indique quem aprova manualmente e quais e-mails/mensagens enviar (os e-mails são simulados por enquanto).</li>' +
                '</ol></div>',
            },
            { fieldLabel: 'Nome do fluxo', fieldType: 'text', requiredField: true, placeholder: 'Ex.: Aprovação de Férias' },
            {
              fieldLabel: 'Gatilho inicial',
              fieldType: 'dropdown',
              requiredField: true,
              fieldOptions: {
                values: [
                  { option: 'Webhook' },
                  { option: 'Agendamento (Cron)' },
                  { option: 'Formulário n8n' },
                  { option: 'E-mail (Gmail)' },
                  { option: 'Telegram' },
                  { option: 'Manual' },
                ],
              },
            },
            { fieldLabel: '1) Dados de entrada (o que coletar do usuário)', fieldType: 'textarea', requiredField: true, placeholder: 'Ex.: matrícula, data de início, data de fim, se vai vender parte das férias' },
            { fieldLabel: '2) Fontes de validação (onde consultar os dados)', fieldType: 'textarea', requiredField: true, placeholder: 'Ex.: planilha com aba "colaboradores" (matricula, saldoDias, emailGestor) e aba "ferias" (histórico)' },
            { fieldLabel: '3) Regras de validação (uma por linha)', fieldType: 'textarea', requiredField: true, placeholder: 'Ex.:\\n- antecedência mínima de 30 dias\\n- mínimo de 5 dias corridos\\n- não exceder o saldo de dias' },
            { fieldLabel: '4) Etapas do processo (passo a passo)', fieldType: 'textarea', requiredField: true, placeholder: 'Ex.: validar; se reprovado mostrar erro ao colaborador; se aprovado enviar e-mail ao gestor e abrir aprovação manual; registrar; notificar o colaborador' },
            { fieldLabel: '5) Aprovações e notificações', fieldType: 'textarea', requiredField: false, placeholder: 'Ex.: o gestor do colaborador aprova manualmente; enviar e-mail (simulado) ao gestor e ao colaborador' },
          ],
        },
        options: {},
      },
      id: 'c-trigger',
      name: 'Solicitar Automação',
      type: 'n8n-nodes-base.formTrigger',
      typeVersion: V.formTrigger,
      position: pos(-600, 300),
      webhookId: 'criador-de-fluxos',
      ...(credBasic ? { credentials: credBasic } : {}),
    },
    {
      parameters: {
        assignments: {
          assignments: [
            setA('e-nome', 'nomeFluxo', '={{ $json["Nome do fluxo"] }}'),
            setA('e-gat', 'gatilho', '={{ $json["Gatilho inicial"] }}'),
            setA(
              'e-aco',
              'acoes',
              '={{ "DADOS DE ENTRADA:\\n" + $json["1) Dados de entrada (o que coletar do usuário)"] + "\\n\\nFONTES DE VALIDAÇÃO:\\n" + $json["2) Fontes de validação (onde consultar os dados)"] + "\\n\\nREGRAS DE VALIDAÇÃO:\\n" + $json["3) Regras de validação (uma por linha)"] + "\\n\\nETAPAS DO PROCESSO:\\n" + $json["4) Etapas do processo (passo a passo)"] }}',
            ),
            setA('e-det', 'detalhes', '={{ $json["5) Aprovações e notificações"] ?? "" }}'),
            setA('e-fb', 'feedback', '=', 'string'),
            setA('e-err', 'errosAnteriores', '={{ [] }}', 'array'),
            setA('e-rod', 'rodada', '={{ 1 }}', 'number'),
          ],
        },
        options: {},
      },
      id: 'c-estado',
      name: 'Estado',
      type: 'n8n-nodes-base.set',
      typeVersion: V.set,
      position: pos(-360, 300),
    },
    {
      parameters: {
        workflowId: { __rl: true, value: nucleo, mode: 'id' },
        workflowInputs: {
          mappingMode: 'defineBelow',
          value: {
            nomeFluxo: '={{ $json.nomeFluxo }}',
            gatilho: '={{ $json.gatilho }}',
            acoes: '={{ $json.acoes }}',
            detalhes: '={{ $json.detalhes }}',
            feedback: '={{ $json.feedback }}',
            errosAnteriores: '={{ $json.errosAnteriores }}',
          },
        },
        options: { waitForSubWorkflow: true },
      },
      id: 'c-chamar',
      name: 'Chamar Núcleo',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: V.executeWorkflow,
      position: pos(-120, 300),
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, typeValidation: 'loose', version: 2 },
          conditions: [{ id: 'ok', leftValue: '={{ $json.ok }}', rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
          combinator: 'and',
        },
        options: {},
      },
      id: 'c-if-ok',
      name: 'Gerou com sucesso?',
      type: 'n8n-nodes-base.if',
      typeVersion: V.if,
      position: pos(120, 300),
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: code('preview-html.js') },
      id: 'c-preview',
      name: 'Pré-visualização',
      type: 'n8n-nodes-base.code',
      typeVersion: V.code,
      position: pos(360, 200),
    },
    {
      parameters: {
        operation: 'page',
        formFields: {
          values: [
            { fieldType: 'html', elementName: 'previa', html: '={{ $json.previewHtml }}' },
            {
              fieldLabel: 'Decisão',
              fieldType: 'radio',
              requiredField: true,
              fieldOptions: { values: [{ option: 'Aprovar e criar' }, { option: 'Ajustar' }, { option: 'Cancelar' }] },
            },
            { fieldLabel: 'Feedback para ajuste (opcional)', fieldType: 'textarea', requiredField: false },
          ],
        },
        options: {},
      },
      id: 'c-revisao',
      name: 'Revisão do Fluxo',
      type: 'n8n-nodes-base.form',
      typeVersion: V.form,
      position: pos(600, 200),
      webhookId: 'criador-revisao',
    },
    {
      parameters: {
        rules: {
          values: [
            { conditions: condIgual('d-apr', '={{ $json.Decisão }}', 'Aprovar e criar'), outputKey: 'Aprovar' },
            { conditions: condIgual('d-aju', '={{ $json.Decisão }}', 'Ajustar'), outputKey: 'Ajustar' },
            { conditions: condIgual('d-can', '={{ $json.Decisão }}', 'Cancelar'), outputKey: 'Cancelar' },
          ],
        },
        options: {},
      },
      id: 'c-decisao',
      name: 'Decisão',
      type: 'n8n-nodes-base.switch',
      typeVersion: V.switch,
      position: pos(840, 200),
    },
    {
      parameters: {
        resource: 'workflow',
        operation: 'create',
        workflowObject: "={{ JSON.stringify($('Pré-visualização').item.json.workflow) }}",
      },
      id: 'c-criar',
      name: 'Criar Workflow',
      type: 'n8n-nodes-base.n8n',
      typeVersion: V.n8n,
      position: pos(1100, 80),
      onError: 'continueErrorOutput',
      ...(credN8n ? { credentials: credN8n } : {}),
    },
    {
      parameters: {
        method: 'POST',
        url: '=http://localhost:5678/api/v1/workflows/{{ $json.id }}/activate',
        authentication: 'genericCredentialType',
        genericAuthType: 'httpHeaderAuth',
        options: {},
      },
      id: 'c-publicar',
      name: 'Publicar Fluxo',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.5,
      position: pos(1360, 80),
      onError: 'continueRegularOutput',
      ...(credN8nHeader ? { credentials: credN8nHeader } : {}),
    },
    {
      parameters: {
        operation: 'completion',
        respondWith: 'showText',
        responseText:
          '=<h2>✅ Fluxo criado e publicado!</h2><p>O workflow <strong>{{ $(\'Criar Workflow\').item.json.name }}</strong> foi criado com {{ ($(\'Criar Workflow\').item.json.nodes || []).length }} nó(s) e já está ativo.</p><p><a href="http://localhost:5678/workflow/{{ $(\'Criar Workflow\').item.json.id }}">Abrir no editor</a></p>',
        options: {},
      },
      id: 'c-fim-sucesso',
      name: 'Fim: Sucesso',
      type: 'n8n-nodes-base.form',
      typeVersion: V.form,
      position: pos(1620, 0),
      webhookId: 'criador-fim-sucesso',
    },
    {
      parameters: {
        assignments: {
          assignments: [
            setA('nr-nome', 'nomeFluxo', "={{ $('Estado').item.json.nomeFluxo }}"),
            setA('nr-gat', 'gatilho', "={{ $('Estado').item.json.gatilho }}"),
            setA('nr-aco', 'acoes', "={{ $('Estado').item.json.acoes }}"),
            setA('nr-det', 'detalhes', "={{ $('Estado').item.json.detalhes }}"),
            setA('nr-fb', 'feedback', "={{ $('Revisão do Fluxo').item.json['Feedback para ajuste (opcional)'] || 'Ajuste o fluxo.' }}"),
            setA('nr-err', 'errosAnteriores', '={{ [] }}', 'array'),
            setA('nr-rod', 'rodada', "={{ $('Estado').item.json.rodada + 1 }}", 'number'),
          ],
        },
        options: {},
      },
      id: 'c-nova-rodada',
      name: 'Nova Rodada',
      type: 'n8n-nodes-base.set',
      typeVersion: V.set,
      position: pos(1100, 320),
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, typeValidation: 'loose', version: 2 },
          conditions: [{ id: 'lim', leftValue: '={{ $json.rodada }}', rightValue: 3, operator: { type: 'number', operation: 'lte' } }],
          combinator: 'and',
        },
        options: {},
      },
      id: 'c-if-limite',
      name: 'Dentro do limite?',
      type: 'n8n-nodes-base.if',
      typeVersion: V.if,
      position: pos(1340, 320),
    },
    {
      parameters: {
        operation: 'completion',
        respondWith: 'showText',
        responseText: '<h2>Limite de ajustes atingido</h2><p>Foram feitas 3 rodadas. Inicie um novo pedido para continuar.</p>',
        options: {},
      },
      id: 'c-fim-limite',
      name: 'Fim: Limite',
      type: 'n8n-nodes-base.form',
      typeVersion: V.form,
      position: pos(1580, 420),
      webhookId: 'criador-fim-limite',
    },
    {
      parameters: {
        operation: 'completion',
        respondWith: 'showText',
        responseText: '=<h2>Não foi possível gerar o fluxo</h2><p>{{ $json.motivo || ($json.erros || []).join("; ") }}</p>',
        options: {},
      },
      id: 'c-fim-falha',
      name: 'Fim: Falha',
      type: 'n8n-nodes-base.form',
      typeVersion: V.form,
      position: pos(360, 460),
      webhookId: 'criador-fim-falha',
    },
    {
      parameters: {
        operation: 'completion',
        respondWith: 'showText',
        responseText: '<h2>Operação cancelada</h2><p>Nenhum fluxo foi criado.</p>',
        options: {},
      },
      id: 'c-fim-cancelado',
      name: 'Fim: Cancelado',
      type: 'n8n-nodes-base.form',
      typeVersion: V.form,
      position: pos(1100, 560),
      webhookId: 'criador-fim-cancelado',
    },
  ];

  const connections: Record<string, unknown> = {
    'Solicitar Automação': { main: [[{ node: 'Estado', type: 'main', index: 0 }]] },
    Estado: { main: [[{ node: 'Chamar Núcleo', type: 'main', index: 0 }]] },
    'Chamar Núcleo': { main: [[{ node: 'Gerou com sucesso?', type: 'main', index: 0 }]] },
    'Gerou com sucesso?': {
      main: [
        [{ node: 'Pré-visualização', type: 'main', index: 0 }], // true
        [{ node: 'Fim: Falha', type: 'main', index: 0 }], // false
      ],
    },
    'Pré-visualização': { main: [[{ node: 'Revisão do Fluxo', type: 'main', index: 0 }]] },
    'Revisão do Fluxo': { main: [[{ node: 'Decisão', type: 'main', index: 0 }]] },
    Decisão: {
      main: [
        [{ node: 'Criar Workflow', type: 'main', index: 0 }], // Aprovar
        [{ node: 'Nova Rodada', type: 'main', index: 0 }], // Ajustar
        [{ node: 'Fim: Cancelado', type: 'main', index: 0 }], // Cancelar
      ],
    },
    'Criar Workflow': {
      main: [
        [{ node: 'Publicar Fluxo', type: 'main', index: 0 }], // sucesso -> publica
        [{ node: 'Nova Rodada', type: 'main', index: 0 }], // erro (continueErrorOutput)
      ],
    },
    'Publicar Fluxo': { main: [[{ node: 'Fim: Sucesso', type: 'main', index: 0 }]] },
    'Nova Rodada': { main: [[{ node: 'Dentro do limite?', type: 'main', index: 0 }]] },
    'Dentro do limite?': {
      main: [
        [{ node: 'Chamar Núcleo', type: 'main', index: 0 }], // sim -> loop
        [{ node: 'Fim: Limite', type: 'main', index: 0 }], // não
      ],
    },
  };

  return { name: NOME, nodes, connections, settings: { executionOrder: 'v1' } };
}

async function main(): Promise<void> {
  const cliente = criarCliente();
  const wf = build();
  const lista = await cliente.listarWorkflows(100);
  const existente = lista.data.find((w) => w.name === NOME);

  let id: string;
  if (existente) {
    await cliente.request(`/workflows/${existente.id}`, { method: 'PUT', body: JSON.stringify(wf) });
    id = existente.id;
    console.log(`Atualizado: [${id}] ${NOME}`);
  } else {
    const criado = await cliente.request<{ id: string }>('/workflows', { method: 'POST', body: JSON.stringify(wf) });
    id = criado.id;
    console.log(`Criado: [${id}] ${NOME}`);
  }

  const manifesto: Array<{ id: string; arquivo: string }> = fs.existsSync(MANIFESTO)
    ? JSON.parse(fs.readFileSync(MANIFESTO, 'utf8'))
    : [];
  const semEste = manifesto.filter((m) => m.arquivo !== 'criador-fluxos.json');
  semEste.push({ id, arquivo: 'criador-fluxos.json' });
  fs.writeFileSync(MANIFESTO, JSON.stringify(semEste, null, 2) + '\n');
  console.log(`Abrir: http://localhost:5678/workflow/${id}`);
}

main().catch((e) => {
  console.error('Falha:', e.message);
  if ((e as { corpo?: string }).corpo) console.error('Corpo:', (e as { corpo?: string }).corpo);
  process.exit(1);
});
