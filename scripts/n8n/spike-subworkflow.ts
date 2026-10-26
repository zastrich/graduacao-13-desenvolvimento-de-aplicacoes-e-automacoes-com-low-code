/**
 * Task 3 — verifica se um Execute Sub-workflow Trigger pode ser chamado
 * sem o sub-workflow estar publicado.
 *
 * Cria um sub-workflow (Execute Sub-workflow Trigger -> Set) e um chamador
 * (Manual Trigger -> Execute Sub-workflow). Ambos NÃO publicados.
 * Imprime os IDs para teste manual via "Execute" na UI.
 */
import { criarCliente } from './lib/api.ts';

const V = {
  executeWorkflowTrigger: 1.3,
  set: 3.5,
  manualTrigger: 1,
  executeWorkflow: 1.4,
};

async function main(): Promise<void> {
  const cliente = criarCliente();

  const sub = {
    name: '[Spike] Sub Trivial',
    settings: { executionOrder: 'v1' as const },
    nodes: [
      {
        parameters: { workflowInputs: { values: [{ name: 'texto', type: 'string' }] } },
        id: 'sub-trigger',
        name: 'When Executed by Another Workflow',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        typeVersion: V.executeWorkflowTrigger,
        position: [0, 0] as [number, number],
      },
      {
        parameters: {
          assignments: {
            assignments: [
              { id: 'a1', name: 'eco', value: '={{ $json.texto }}', type: 'string' },
            ],
          },
          options: {},
        },
        id: 'sub-set',
        name: 'Eco',
        type: 'n8n-nodes-base.set',
        typeVersion: V.set,
        position: [220, 0] as [number, number],
      },
    ],
    connections: {
      'When Executed by Another Workflow': {
        main: [[{ node: 'Eco', type: 'main', index: 0 }]],
      },
    },
  };

  const criadoSub = await cliente.request<{ id: string; name: string }>('/workflows', {
    method: 'POST',
    body: JSON.stringify(sub),
  });
  console.log(`Sub-workflow (NÃO publicado): [${criadoSub.id}] ${criadoSub.name}`);

  const chamador = {
    name: '[Spike] Chamador',
    settings: { executionOrder: 'v1' as const },
    nodes: [
      {
        parameters: {},
        id: 'call-trigger',
        name: 'Manual',
        type: 'n8n-nodes-base.manualTrigger',
        typeVersion: V.manualTrigger,
        position: [0, 0] as [number, number],
      },
      {
        parameters: {
          workflowId: { __rl: true, value: criadoSub.id, mode: 'id' },
          workflowInputs: {
            mappingMode: 'defineBelow',
            value: { texto: 'ola do chamador' },
          },
          options: {},
        },
        id: 'call-exec',
        name: 'Chamar Sub',
        type: 'n8n-nodes-base.executeWorkflow',
        typeVersion: V.executeWorkflow,
        position: [220, 0] as [number, number],
      },
    ],
    connections: {
      Manual: { main: [[{ node: 'Chamar Sub', type: 'main', index: 0 }]] },
    },
  };

  const criadoChamador = await cliente.request<{ id: string; name: string }>('/workflows', {
    method: 'POST',
    body: JSON.stringify(chamador),
  });
  console.log(`Chamador (NÃO publicado): [${criadoChamador.id}] ${criadoChamador.name}`);
  console.log(`Abrir chamador: http://localhost:5678/workflow/${criadoChamador.id}`);
  console.log('Teste: abrir o chamador e clicar em Execute. Se o sub rodar, não precisa publicar.');
}

main().catch((e) => {
  console.error('Falha:', e.message);
  if (e.corpo) console.error('Corpo:', e.corpo);
  process.exit(1);
});
