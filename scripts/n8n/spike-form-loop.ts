/**
 * Task 3 — cria o workflow [Spike] Form Loop via API para validar:
 * - formulário multi-página com loop (Switch volta à página)
 * - Form Ending "Show Text" com HTML
 * - um Code node (alvo do teste de colagem na UI)
 *
 * Script temporário de spike; pode ser removido após a validação.
 */
import { criarCliente } from './lib/api.ts';

const V = {
  formTrigger: 2.6,
  form: 2.5,
  switch: 3.4,
  code: 2,
};

function pos(x: number, y: number): [number, number] {
  return [x, y];
}

const workflow = {
  name: '[Spike] Form Loop',
  settings: { executionOrder: 'v1' as const },
  nodes: [
    {
      parameters: {
        formTitle: 'Spike Loop',
        formDescription: 'Teste de loop de formulário',
        formFields: {
          values: [
            { fieldLabel: 'Seu nome', fieldType: 'text', requiredField: true },
          ],
        },
      },
      id: 'node-trigger',
      name: 'Form Trigger',
      type: 'n8n-nodes-base.formTrigger',
      typeVersion: V.formTrigger,
      position: pos(0, 300),
      webhookId: 'spike-form-loop-trigger',
    },
    {
      parameters: {
        jsCode: '// placeholder — será substituído pelo teste de colagem na UI\nreturn items;',
      },
      id: 'node-code',
      name: 'Code Placeholder',
      type: 'n8n-nodes-base.code',
      typeVersion: V.code,
      position: pos(220, 300),
    },
    {
      parameters: {
        operation: 'page',
        formFields: {
          values: [
            {
              fieldType: 'html',
              elementName: 'resumo',
              html: '<div><h3>Revisão</h3><table><tr><td>Campo</td><td>Valor</td></tr><tr><td>Nome</td><td>exemplo</td></tr></table></div>',
            },
            {
              fieldLabel: 'O que deseja fazer?',
              fieldType: 'radio',
              requiredField: true,
              fieldOptions: {
                values: [{ option: 'Repetir' }, { option: 'Encerrar' }],
              },
            },
          ],
        },
      },
      id: 'node-page',
      name: 'Página',
      type: 'n8n-nodes-base.form',
      typeVersion: V.form,
      position: pos(440, 300),
      webhookId: 'spike-form-loop-page',
    },
    {
      parameters: {
        rules: {
          values: [
            {
              conditions: {
                options: { caseSensitive: true, typeValidation: 'strict', version: 2 },
                conditions: [
                  {
                    leftValue: '={{ $json["O que deseja fazer?"] }}',
                    rightValue: 'Repetir',
                    operator: { type: 'string', operation: 'equals' },
                  },
                ],
                combinator: 'and',
              },
              outputKey: 'Repetir',
            },
            {
              conditions: {
                options: { caseSensitive: true, typeValidation: 'strict', version: 2 },
                conditions: [
                  {
                    leftValue: '={{ $json["O que deseja fazer?"] }}',
                    rightValue: 'Encerrar',
                    operator: { type: 'string', operation: 'equals' },
                  },
                ],
                combinator: 'and',
              },
              outputKey: 'Encerrar',
            },
          ],
        },
        options: {},
      },
      id: 'node-switch',
      name: 'Decisão',
      type: 'n8n-nodes-base.switch',
      typeVersion: V.switch,
      position: pos(660, 300),
    },
    {
      parameters: {
        operation: 'completion',
        respondWith: 'showText',
        completionTitle: 'Concluído',
        completionMessage: '',
        responseText:
          '<h2>Fluxo encerrado</h2><p>Link: <a href="http://localhost:5678/home/workflows">Abrir workflows</a></p>',
      },
      id: 'node-ending',
      name: 'Fim',
      type: 'n8n-nodes-base.form',
      typeVersion: V.form,
      position: pos(880, 420),
      webhookId: 'spike-form-loop-ending',
    },
  ],
  connections: {
    'Form Trigger': { main: [[{ node: 'Code Placeholder', type: 'main', index: 0 }]] },
    'Code Placeholder': { main: [[{ node: 'Página', type: 'main', index: 0 }]] },
    Página: { main: [[{ node: 'Decisão', type: 'main', index: 0 }]] },
    Decisão: {
      main: [
        [{ node: 'Página', type: 'main', index: 0 }], // Repetir -> volta à página
        [{ node: 'Fim', type: 'main', index: 0 }], // Encerrar -> Form Ending
      ],
    },
  },
};

async function main(): Promise<void> {
  const cliente = criarCliente();
  const criado = await cliente.request<{ id: string; name: string }>('/workflows', {
    method: 'POST',
    body: JSON.stringify(workflow),
  });
  console.log(`Criado: [${criado.id}] ${criado.name}`);
  console.log(`Abrir: http://localhost:5678/workflow/${criado.id}`);
}

main().catch((e) => {
  console.error('Falha ao criar o spike:', e.message);
  if (e.corpo) console.error('Corpo:', e.corpo);
  process.exit(1);
});
