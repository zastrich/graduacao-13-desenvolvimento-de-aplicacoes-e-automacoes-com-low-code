/**
 * Dispara o webhook dry-run do Núcleo Gerador com um pedido de exemplo,
 * revalida a resposta localmente e imprime o resumo.
 *
 * Uso:
 *   tsx dry-run.ts pedido-01           (um pedido de n8n/exemplos/)
 *   tsx dry-run.ts --todos             (todos os pedido-*.json)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv, obrigatorio } from './lib/env.ts';
import { carregarConfig } from './lib/api.ts';
import { carregarCatalogo } from './lib/catalogo.ts';
import { validarWorkflow, type EntradaCatalogo } from './lib/validar-workflow.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..', '..');
const ENV = path.resolve(__dirname, '..', '.env');
const EXEMPLOS = path.join(RAIZ, 'n8n', 'exemplos');
const PATH_WEBHOOK = 'meta-gerador-dry-run';

interface Resultado {
  pedido: string;
  ok: boolean;
  impossivel: boolean;
  tentativas: number | string;
  ms: number;
  detalhe: string;
}

async function dispararUm(nome: string): Promise<Resultado> {
  const env = lerEnv(ENV);
  const { baseUrl } = carregarConfig(env);
  const token = obrigatorio(env, 'DRY_RUN_TOKEN');
  const pedido = JSON.parse(fs.readFileSync(path.join(EXEMPLOS, `${nome}.json`), 'utf8'));

  const url = `${baseUrl.replace(/\/+$/, '')}/webhook/${PATH_WEBHOOK}`;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 280000);
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Dry-Run-Token': token },
      body: JSON.stringify(pedido),
      signal: ac.signal,
    });
    const ms = Date.now() - t0;
    const texto = await r.text();
    if (!r.ok) {
      const servicoInstavel = /unavailable|503|high demand/i.test(texto);
      const detalhe = servicoInstavel
        ? 'Gemini indisponível (503) — instabilidade do free tier, tente de novo'
        : `HTTP ${r.status}: ${texto.slice(0, 120)}`;
      return { pedido: nome, ok: false, impossivel: false, tentativas: '-', ms, detalhe };
    }
    const resp = JSON.parse(texto) as {
      ok?: boolean;
      impossivel?: boolean;
      motivo?: string;
      tentativa?: number;
      workflow?: unknown;
      erros?: string[];
    };

    // Revalida localmente (defesa em profundidade)
    let detalhe = '';
    if (resp.ok && resp.workflow) {
      const cat = carregarCatalogo().nos.map(
        (n): EntradaCatalogo => ({ type: n.type, typeVersion: n.typeVersion, categoria: n.categoria, obrigatorios: n.obrigatorios }),
      );
      const rev = validarWorkflow(JSON.stringify(resp.workflow), cat, pedido.nomeFluxo);
      const wf = resp.workflow as { nodes?: unknown[] };
      detalhe = `nós=${wf.nodes?.length ?? '?'} revalida=${rev.ok ? 'ok' : 'FALHA'}`;
    } else if (resp.impossivel) {
      detalhe = `impossível: ${resp.motivo ?? ''}`.slice(0, 80);
    } else {
      detalhe = `erros: ${(resp.erros ?? []).slice(0, 2).join(' | ')}`.slice(0, 120);
    }

    return {
      pedido: nome,
      ok: !!resp.ok,
      impossivel: !!resp.impossivel,
      tentativas: resp.tentativa ?? '-',
      ms,
      detalhe,
    };
  } catch (e) {
    return { pedido: nome, ok: false, impossivel: false, tentativas: '-', ms: Date.now() - t0, detalhe: (e as Error).message };
  } finally {
    clearTimeout(to);
  }
}

function listarPedidos(): string[] {
  return fs
    .readdirSync(EXEMPLOS)
    .filter((f) => /^pedido-[\w-]+\.json$/.test(f))
    .map((f) => f.replace('.json', ''))
    .sort();
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  const nomes = arg === '--todos' || !arg ? listarPedidos() : [arg];

  const resultados: Resultado[] = [];
  for (const nome of nomes) {
    process.stdout.write(`Disparando ${nome}... `);
    const r = await dispararUm(nome);
    console.log(`${r.ok ? 'OK' : r.impossivel ? 'IMPOSSÍVEL' : 'FALHA'} (${r.ms}ms, tentativas=${r.tentativas}) ${r.detalhe}`);
    resultados.push(r);
  }

  console.log('\n=== RESUMO ===');
  console.log('PEDIDO'.padEnd(12) + 'STATUS'.padEnd(12) + 'TENT'.padEnd(6) + 'TEMPO'.padEnd(9) + 'DETALHE');
  for (const r of resultados) {
    const status = r.ok ? 'OK' : r.impossivel ? 'IMPOSSÍVEL' : 'FALHA';
    console.log(
      r.pedido.padEnd(12) + status.padEnd(12) + String(r.tentativas).padEnd(6) + `${r.ms}ms`.padEnd(9) + r.detalhe,
    );
  }
  const okCount = resultados.filter((r) => r.ok).length;
  console.log(`\n${okCount}/${resultados.length} com workflow válido.`);
}

main().catch((e) => {
  console.error('Erro:', (e as Error).message);
  process.exit(1);
});
