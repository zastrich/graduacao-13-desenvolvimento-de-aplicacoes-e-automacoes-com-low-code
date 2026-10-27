/**
 * Gera áudios de narração (MP3) via ElevenLabs Text-to-Speech, usando uma voz
 * clonada. Projetado para ser genérico e reutilizável:
 *
 *   - gera a partir de um roteiro JSON (vários blocos) OU de um texto avulso;
 *   - voz, modelo, saída e voice_settings são configuráveis por flags;
 *   - a chave vem de ELEVENLABS_API_KEY em scripts/.env.
 *
 * O roteiro JSON é um array de objetos { "arquivo": "01-x.mp3", "texto": "..." }.
 * Veja o exemplo em assets/roteiro/narracao.json.
 *
 * Exemplos:
 *   # roteiro completo (default: assets/roteiro/narracao.json -> assets/roteiro/audio/)
 *   tsx gerar-narracao.ts
 *
 *   # roteiro específico e pasta de saída
 *   tsx gerar-narracao.ts --roteiro=assets/roteiro/narracao.json --saida=assets/roteiro/audio
 *
 *   # texto avulso num único arquivo
 *   tsx gerar-narracao.ts --texto="Olá, isto é um teste." --arquivo=teste.mp3
 *
 *   # ajustar voz/expressividade/velocidade
 *   tsx gerar-narracao.ts --voice=VJoiH1lGUvdp6veWvREc --style=0.1 --speed=1.1 --stability=0.4
 *
 * Flags:
 *   --roteiro=<caminho.json>   Roteiro com blocos (default: assets/roteiro/narracao.json)
 *   --texto="..."              Gera um único áudio a partir deste texto (ignora --roteiro)
 *   --arquivo=<nome.mp3>       Nome do arquivo quando usa --texto (default: narracao.mp3)
 *   --saida=<pasta>            Pasta de saída (default: assets/roteiro/audio)
 *   --voice=<voice_id>         ID da voz ElevenLabs (default: voz clonada "Zas")
 *   --model=<model_id>         Modelo (default: eleven_multilingual_v2)
 *   --stability=<0..1>         Consistência (default: 0.4)
 *   --similarity=<0..1>        Fidelidade à voz original (default: 0.8)
 *   --style=<0..1>            Expressividade (default: 0.05)
 *   --speed=<0.7..1.2>         Velocidade (default: 1.14)
 *   --format=<output_format>   Formato ElevenLabs (default: mp3_44100_128)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');

// ---------- Parsing de flags ----------
function parseFlags(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/s);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const flags = parseFlags(process.argv.slice(2));

function abs(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(RAIZ, p);
}

function lerChave(): string {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const env = fs.readFileSync(path.join(RAIZ, 'scripts', '.env'), 'utf8');
  const linha = env.split(/\r?\n/).find((l) => l.startsWith('ELEVENLABS_API_KEY='));
  if (!linha) throw new Error('ELEVENLABS_API_KEY ausente (defina no ambiente ou em scripts/.env)');
  return linha.slice('ELEVENLABS_API_KEY='.length).trim();
}

// ---------- Configuração (flags com defaults) ----------
const VOICE_ID = flags.voice ?? 'VJoiH1lGUvdp6veWvREc'; // voz clonada "Zas"
const MODEL = flags.model ?? 'eleven_multilingual_v2';  // melhor para português
const FORMAT = flags.format ?? 'mp3_44100_128';
const VOICE_SETTINGS = {
  stability: Number(flags.stability ?? 0.4),
  similarity_boost: Number(flags.similarity ?? 0.8),
  style: Number(flags.style ?? 0.05),
  speed: Number(flags.speed ?? 1.14),
  use_speaker_boost: true,
};
const SAIDA = abs(flags.saida ?? 'assets/roteiro/audio');

interface Bloco { arquivo: string; texto: string; }

function carregarBlocos(): Bloco[] {
  if (flags.texto !== undefined) {
    return [{ arquivo: flags.arquivo ?? 'narracao.mp3', texto: flags.texto }];
  }
  const roteiro = abs(flags.roteiro ?? 'assets/roteiro/narracao.json');
  if (!fs.existsSync(roteiro)) {
    throw new Error(`Roteiro não encontrado: ${roteiro}. Passe --roteiro=<arquivo.json> ou --texto="...".`);
  }
  const dados = JSON.parse(fs.readFileSync(roteiro, 'utf8'));
  if (!Array.isArray(dados)) throw new Error('O roteiro JSON deve ser um array de { arquivo, texto }.');
  return dados as Bloco[];
}

async function tts(key: string, texto: string): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${FORMAT}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ text: texto, model_id: MODEL, voice_settings: VOICE_SETTINGS }),
  });
  if (!resp.ok) {
    const erro = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${erro.slice(0, 200)}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

async function main(): Promise<void> {
  const key = lerChave();
  const blocos = carregarBlocos();
  fs.mkdirSync(SAIDA, { recursive: true });

  console.log(`Voz ${VOICE_ID} | modelo ${MODEL} | settings`, VOICE_SETTINGS);
  for (const bloco of blocos) {
    if (!bloco.arquivo || !bloco.texto) {
      console.error('Bloco inválido (precisa de "arquivo" e "texto"):', JSON.stringify(bloco).slice(0, 120));
      process.exit(1);
    }
    const buf = await tts(key, bloco.texto);
    const saida = path.join(SAIDA, bloco.arquivo);
    fs.writeFileSync(saida, buf);
    console.log(`OK ${bloco.arquivo} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
  console.log(`\n${blocos.length} áudio(s) gerado(s) em ${path.relative(RAIZ, SAIDA)}/`);
}

main().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
