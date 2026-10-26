/**
 * Testa a validade da chave do Gemini e um modelo específico.
 * Uso: tsx testar-gemini.ts [modelo]   (default: gemini-flash-latest)
 * Lê GEMINI_API_KEY de scripts/.env. Não ecoa a chave.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv, obrigatorio } from './lib/env.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(__dirname, '..', '.env');

async function comTimeout(p: Promise<Response>, ms: number): Promise<Response> {
  const ctrl = new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
  return Promise.race([p, ctrl]);
}

async function main(): Promise<void> {
  const env = lerEnv(ENV);
  const key = obrigatorio(env, 'GEMINI_API_KEY', 'Defina em scripts/.env.');
  const modelo = process.argv[2] ?? 'gemini-flash-latest';

  const r = await comTimeout(
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Responda apenas com o JSON {"ok": true} e nada mais.' }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      },
    ),
    25000,
  );
  if (!r.ok) {
    console.error(`[${r.status}] ${modelo}`);
    console.error((await r.text()).slice(0, 300));
    process.exit(1);
  }
  const gen = (await r.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const txt = gen.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  console.log(`[OK] ${modelo} -> ${txt.trim().slice(0, 80)}`);
}

main().catch((e) => {
  console.error('Erro:', (e as Error).message);
  process.exit(1);
});
