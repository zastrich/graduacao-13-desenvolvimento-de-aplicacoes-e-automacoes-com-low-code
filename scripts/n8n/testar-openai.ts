/** Valida a chave OpenAI e testa geração de JSON. Uso: tsx testar-openai.ts [modelo] */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv, obrigatorio } from './lib/env.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(__dirname, '..', '.env');

async function main(): Promise<void> {
  const key = obrigatorio(lerEnv(ENV), 'OPENAI_API_KEY', 'Defina em scripts/.env.');
  const modelo = process.argv[2] ?? 'gpt-4o-mini';

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 30000);
  const t0 = Date.now();
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      signal: ac.signal,
      body: JSON.stringify({
        model: modelo,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Responda apenas com JSON válido.' },
          { role: 'user', content: 'Gere o JSON {"ok": true, "modelo": "<nome>"} e nada mais.' },
        ],
      }),
    });
    const ms = Date.now() - t0;
    if (!r.ok) {
      console.error(`[${r.status}] ${modelo} (${ms}ms)`);
      console.error((await r.text()).slice(0, 300));
      process.exit(1);
    }
    const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const txt = j.choices?.[0]?.message?.content ?? '';
    console.log(`[OK] ${modelo} (${ms}ms) -> ${txt.trim().slice(0, 80)}`);
  } finally {
    clearTimeout(to);
  }
}

main().catch((e) => {
  console.error('Erro:', (e as Error).message);
  process.exit(1);
});
