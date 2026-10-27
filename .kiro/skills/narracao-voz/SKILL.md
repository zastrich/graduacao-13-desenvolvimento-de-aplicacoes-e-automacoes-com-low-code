---
name: narracao-voz
description: >-
  Gera áudios de narração (MP3) com a voz clonada do autor no ElevenLabs, a
  partir de um roteiro JSON ou de um texto avulso. Use quando o usuário pedir
  para "gerar narração", "criar a locução/voz do vídeo", "gerar o áudio do
  pitch/roteiro", "narrar com a minha voz", ou regerar/ajustar a narração
  (velocidade, expressividade). Encapsula o uso do script
  scripts/gerar-narracao.ts e a API Text-to-Speech do ElevenLabs.
---

# Narração com voz clonada (ElevenLabs TTS)

Gera arquivos MP3 de narração usando a voz clonada do autor ("Zas") no ElevenLabs.
A lógica está em `scripts/gerar-narracao.ts`; esta skill explica como usá-lo.

## Pré-requisitos

- `ELEVENLABS_API_KEY` definido em `scripts/.env` (ou no ambiente). Está no `.gitignore`.
- A voz clonada já existe na conta ElevenLabs. A voz padrão "Zas" tem o
  `voice_id` `VJoiH1lGUvdp6veWvREc`. Para descobrir/validar outras vozes:
  ```bash
  node -e "const fs=require('fs');const env=fs.readFileSync('scripts/.env','utf8');const k=(env.split(/\r?\n/).find(x=>x.startsWith('ELEVENLABS_API_KEY='))||'').slice(19).trim();fetch('https://api.elevenlabs.io/v1/voices',{headers:{'xi-api-key':k}}).then(r=>r.json()).then(j=>j.voices.forEach(v=>console.log(v.voice_id,'|',v.name,'|',v.category)))"
  ```
- Rodar sempre a partir da pasta `scripts/` (o script resolve caminhos relativos à raiz do projeto).

## Uso rápido

Roteiro completo (default: lê `assets/roteiro/narracao.json`, grava em `assets/roteiro/audio/`):

```bash
cd scripts && npx tsx gerar-narracao.ts
```

Um texto avulso (um único MP3):

```bash
cd scripts && npx tsx gerar-narracao.ts --texto="Olá, isto é um teste." --arquivo=teste.mp3 --saida=assets/roteiro/audio
```

Roteiro e saída específicos:

```bash
cd scripts && npx tsx gerar-narracao.ts --roteiro=assets/roteiro/narracao.json --saida=assets/roteiro/audio
```

## Formato do roteiro JSON

Um array de blocos. Cada bloco vira um arquivo de áudio:

```json
[
  { "arquivo": "01-problema.mp3", "texto": "Texto do primeiro bloco..." },
  { "arquivo": "02-arquitetura.mp3", "texto": "Texto do segundo bloco..." }
]
```

Dicas de texto para TTS natural em português:
- Escreva números por extenso quando o ritmo importar (ex.: "quarenta e oito horas").
- Expanda siglas na primeira menção ("inteligência artificial" em vez de "IA").
- Remova marcações de tela/roteiro; deixe só o que será falado.

## Flags (todas com defaults)

| Flag | Default | Efeito |
|------|---------|--------|
| `--roteiro=<arquivo.json>` | `assets/roteiro/narracao.json` | Roteiro com vários blocos |
| `--texto="..."` | — | Gera um único áudio (ignora `--roteiro`) |
| `--arquivo=<nome.mp3>` | `narracao.mp3` | Nome do arquivo quando usa `--texto` |
| `--saida=<pasta>` | `assets/roteiro/audio` | Pasta de saída |
| `--voice=<voice_id>` | `VJoiH1lGUvdp6veWvREc` (Zas) | ID da voz ElevenLabs |
| `--model=<model_id>` | `eleven_multilingual_v2` | Modelo (bom para PT-BR) |
| `--stability=<0..1>` | `0.4` | Menor = mais expressivo |
| `--similarity=<0..1>` | `0.8` | Maior = mais fiel à voz original |
| `--style=<0..1>` | `0.05` | Maior = mais estilização/entonação |
| `--speed=<0.7..1.2>` | `1.14` | Velocidade da fala (teto 1.2) |
| `--format=<output_format>` | `mp3_44100_128` | Formato ElevenLabs |

## Ajuste de voz (settings aprovados pelo autor)

O padrão atual reflete a preferência do autor: fala **um pouco mais rápida** e
**pouco estilizada** (`stability 0.4`, `style 0.05`, `speed 1.14`, `similarity 0.8`).

- Mais rápido: aumentar `--speed` (até 1.2).
- Mais expressivo: aumentar `--style` (0.1–0.5) e/ou baixar `--stability`.
- Mais fiel/limpo: subir `--similarity`; baixar `--style`.

Para testar um ajuste antes de aplicar a tudo, gere só um bloco com `--texto`
e os settings desejados; quando aprovar, rode o roteiro completo com as mesmas flags.

## Saída e verificação

- Os MP3 são 44.1 kHz / 128 kbps (compatíveis com CapCut e editores em geral).
- Confirme que são válidos checando o cabeçalho `ID3`:
  ```bash
  cd assets/roteiro/audio && for f in *.mp3; do printf "%s: " "$f"; head -c 3 "$f" | xxd | head -1 | awk '{print $NF}'; done
  ```

## Observações

- A chave e os áudios são artefatos de mídia; a chave fica fora do git.
- O script falha com mensagem clara se a chave estiver ausente, o roteiro não existir
  ou a API retornar erro (ex.: cota).
