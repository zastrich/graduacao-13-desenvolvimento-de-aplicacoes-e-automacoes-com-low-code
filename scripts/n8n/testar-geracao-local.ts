/**
 * Teste de integração local (fora do n8n): pedido -> prompt -> Gemini -> validador.
 * Simula o que o Núcleo Gerador fará, incluindo autocorreção (até 3 tentativas).
 * Uso: tsx testar-geracao-local.ts <arquivo-pedido.json>
 *
 * Serve para validar o prompt e o pipeline antes de montar o workflow no n8n.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv, obrigatorio } from './lib/env.ts';
import { carregarCatalogo } from './lib/catalogo.ts';
import { montarPrompts, type EstadoPedido, type NoCatalogoPrompt } from './lib/montar-prompt.ts';
import { validarWorkflow, type EntradaCatalogo } from './lib/validar-workflow.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(__dirname, '..', '.env');
const MODELO = process.env.GEMINI_MODELO ?? 'gemini-3.8-flash';

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function chamarGemini(systemPrompt: string, userPrompt: string, key: string): Promise<string> {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 60000);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: ac.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 8192 },
        }),
      },
    );
    if (!r.ok) {
      const corpo = (await r.text()).slice(0, 200);
      const erro = new Error(`HTTP ${r.status}: ${corpo}`);
      (erro as { status?: number }).status = r.status;
      throw erro;
    }
    const j = (await r.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return j.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } finally {
    clearTimeout(to);
  }
}

/** Chama o Gemini com retry/backoff para 503/429 (comum no free tier). */
async function gerar(systemPrompt: string, userPrompt: string, key: string): Promise<string> {
  let ultimoErro: unknown;
  const maxTentativas = Number(process.env.GEMINI_RETRIES ?? 8);
  for (let i = 0; i < maxTentativas; i++) {
    try {
      return await chamarGemini(systemPrompt, userPrompt, key);
    } catch (e) {
      ultimoErro = e;
      const status = (e as { status?: number }).status;
      const msg = (e as Error).message || '';
      const transitorio = status === 503 || status === 429 || /abort/i.test(msg);
      if (!transitorio) throw e;
      const espera = Math.min(3000 * (i + 1), 15000);
      console.log(`  (modelo ocupado/limite — aguardando ${espera / 1000}s e tentando de novo)`);
      await dormir(espera);
    }
  }
  throw ultimoErro;
}

async function main(): Promise<void> {
  const arquivo = process.argv[2];
  if (!arquivo) {
    console.error('Uso: tsx testar-geracao-local.ts <arquivo-pedido.json>');
    process.exit(1);
  }
  const key = obrigatorio(lerEnv(ENV), 'GEMINI_API_KEY');
  const pedido = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as EstadoPedido;

  const catTotal = carregarCatalogo().nos;
  const nosPrompt = catTotal.map(
    (n): NoCatalogoPrompt => ({ type: n.type, typeVersion: n.typeVersion, categoria: n.categoria, descricao: n.descricao, obrigatorios: n.obrigatorios }),
  );
  const nosValid = catTotal.map(
    (n): EntradaCatalogo => ({ type: n.type, typeVersion: n.typeVersion, categoria: n.categoria, obrigatorios: n.obrigatorios }),
  );

  const { systemPrompt } = montarPrompts(pedido, nosPrompt);
  let errosAnteriores: string[] = [];

  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const estado: EstadoPedido = { ...pedido, errosAnteriores };
    const { userPrompt } = montarPrompts(estado, nosPrompt);
    const t0 = Date.now();
    const resposta = await gerar(systemPrompt, userPrompt, key);
    const dt = Date.now() - t0;
    const r = validarWorkflow(resposta, nosValid, pedido.nomeFluxo);
    console.log(`Tentativa ${tentativa}: ok=${r.ok} (${dt}ms)` + (r.impossivel ? ` IMPOSSÍVEL: ${r.motivo}` : ''));
    if (r.ok) {
      console.log('  resumo:', r.resumo);
      console.log('  nós:', r.workflow!.nodes.map((n) => `${n.name}[${n.type.split('.').pop()}]`).join(', '));
      if (r.avisos.length) console.log('  avisos:', r.avisos.length);
      return;
    }
    if (r.impossivel) return;
    console.log('  erros:', r.erros.slice(0, 5).join(' | '));
    errosAnteriores = r.erros;
  }
  console.log('Não gerou workflow válido em 3 tentativas.');
  process.exit(1);
}

main().catch((e) => {
  console.error('Erro:', (e as Error).message);
  process.exit(1);
});
