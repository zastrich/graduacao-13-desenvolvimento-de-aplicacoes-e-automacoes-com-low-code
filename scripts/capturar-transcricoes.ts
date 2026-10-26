/**
 * capturar-transcricoes.ts
 * -------------------------------------------------------------------------
 * Script de automacao (Playwright via MCP server do Kiro) que varre TODOS os
 * modulos e aulas de uma disciplina da plataforma Faculdade de Tecnologia
 * Rocketseat (ftr.rocketseat.com.br) e captura o conteudo transcrito de cada
 * aula.
 *
 * COMO RODAR (importante):
 * Este script NAO roda com `node`/`ts-node` diretamente. Ele foi desenhado
 * para rodar dentro do navegador ja logado do MCP server do Playwright do
 * Kiro. O corpo executavel e a funcao `run(page)` abaixo, que deve ser
 * passada para a ferramenta `mcp_playwright_browser_run_code_unsafe`.
 *
 * Ver instrucoes completas em:
 *   .kiro/steering/rocketseat-transcricoes.md
 *
 * O que ele faz:
 *   1. Le a estrutura de modulos da jornada via API interna
 *      (/v2/journeys/{slug}/details/progress/temp).
 *   2. Para cada modulo (sala), abre a sala e itera as aulas listadas na
 *      sidebar de conteudo.
 *   3. Para cada aula: clica na aula -> clica na aba "Transcricao" -> captura
 *      a resposta JSON do endpoint GET /lessons/{uuid}/transcription.
 *   4. Retorna um objeto com todas as transcricoes agrupadas por modulo, que
 *      o agente do Kiro grava em disco em `assets/transcrição/`.
 *
 * Endpoint da transcricao (descoberto via inspecao de rede / "FET"):
 *   GET https://skylab-api.rocketseat.com.br/lessons/{lessonId}/transcription
 *   -> [{ start: "0.00", end: "6.20", text: "..." }, ...]
 * A autenticacao (Bearer token + tenant-id) e injetada pelo proprio app; por
 * isso capturamos a RESPOSTA que o app dispara ao abrir a aba, em vez de
 * refazer o fetch manualmente.
 * -------------------------------------------------------------------------
 */

// --- Configuracao da disciplina alvo ---------------------------------------
// Basta trocar estes dois valores para reutilizar em outra disciplina.
export const JOURNEY_SLUG = 'produtividade-e-gestao-do-tempo';
export const DISCIPLINA = 'Produtividade e Gestão do Tempo';

const BASE = 'https://ftr.rocketseat.com.br';
const API = 'https://skylab-api.rocketseat.com.br';

// Tipos ---------------------------------------------------------------------
export interface TrechoTranscricao {
  start: string;
  end: string;
  text: string;
}

export interface AulaCapturada {
  ordem: number;
  titulo: string;
  duracao: string | null;
  lessonId: string | null;
  slug: string | null;
  trechos: TrechoTranscricao[];
  erro?: string;
}

export interface ModuloCapturado {
  ordem: number;
  titulo: string;
  slug: string;
  totalAulas: number;
  aulas: AulaCapturada[];
}

export interface ResultadoCaptura {
  disciplina: string;
  journeySlug: string;
  capturadoEm: string;
  modulos: ModuloCapturado[];
}

/**
 * Funcao principal. Recebe a `page` do Playwright (fornecida pelo MCP server)
 * e retorna todas as transcricoes agrupadas por modulo.
 */
export async function run(page: any): Promise<ResultadoCaptura> {
  const sleep = (ms: number) => page.waitForTimeout(ms);

  // 1) Ler a estrutura de modulos da jornada -------------------------------
  //    Garante que estamos autenticados no dominio antes de chamar a API.
  await page.goto(`${BASE}/jornada/${JOURNEY_SLUG}/conteudos`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);

  const modulosBrutos: Array<{ ordem: number; titulo: string; slug: string }> =
    await page.evaluate(async (args: { api: string; slug: string }) => {
      const getCookie = (name: string) => {
        const m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
        return m ? decodeURIComponent(m[2]) : null;
      };
      const token = getCookie('skylab_next_access_token_v4');
      const res = await fetch(
        `${args.api}/v2/journeys/${args.slug}/details/progress/temp`,
        { headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' } },
      );
      const data = await res.json();
      const vistos = new Set<string>();
      const out: Array<{ ordem: number; titulo: string; slug: string }> = [];
      // slug da sala = titulo em kebab-case sem acentos; porem o slug real
      // pode divergir. Guardamos apenas titulo/ordem e resolvemos o slug pela
      // pagina de conteudos (links /sala/...).
      for (const node of data.nodes || []) {
        // apenas nodes que possuem aulas (group ou cluster com total > 0)
        const total = node.lessons?.total || 0;
        if ((node.type === 'group' || node.type === 'cluster') && total > 0) {
          if (!vistos.has(node.title)) {
            vistos.add(node.title);
            out.push({ ordem: node.order, titulo: node.title, slug: '' });
          }
        }
      }
      return out;
    }, { api: API, slug: JOURNEY_SLUG });

  // Resolver o slug real de cada modulo lendo os links /sala/ da pagina de
  // conteudos (mais confiavel que derivar do titulo).
  const salaLinks: Array<{ href: string; titulo: string }> = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/sala/"]')) as HTMLAnchorElement[];
    return anchors.map((a) => ({
      href: a.getAttribute('href') || '',
      titulo: (a.querySelector('h3')?.textContent || a.textContent || '').trim(),
    }));
  });

  const slugPorTitulo = new Map<string, string>();
  for (const l of salaLinks) {
    const m = l.href.match(/\/sala\/([^/?#]+)/);
    if (m) {
      // usa o inicio do texto do link (titulo do modulo) como chave
      const chave = l.titulo.split('\n')[0].trim();
      if (chave) slugPorTitulo.set(chave, m[1]);
    }
  }

  const modulos = modulosBrutos.map((mod) => {
    let slug = slugPorTitulo.get(mod.titulo) || '';
    if (!slug) {
      // fallback: casar por inclusao
      for (const [titulo, s] of slugPorTitulo.entries()) {
        if (titulo.includes(mod.titulo) || mod.titulo.includes(titulo)) {
          slug = s;
          break;
        }
      }
    }
    return { ...mod, slug };
  });

  const resultado: ResultadoCaptura = {
    disciplina: DISCIPLINA,
    journeySlug: JOURNEY_SLUG,
    capturadoEm: new Date().toISOString(),
    modulos: [],
  };

  // 2) Iterar modulos -------------------------------------------------------
  for (const mod of modulos) {
    if (!mod.slug) {
      resultado.modulos.push({
        ordem: mod.ordem,
        titulo: mod.titulo,
        slug: '',
        totalAulas: 0,
        aulas: [{ ordem: 0, titulo: '(slug do modulo nao resolvido)', duracao: null, lessonId: null, slug: null, trechos: [], erro: 'slug_nao_resolvido' }],
      });
      continue;
    }

    await page.goto(`${BASE}/jornada/${JOURNEY_SLUG}/sala/${mod.slug}`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(2500);

    // Listar as aulas da sidebar (botoes cujo nome contem duracao 00:MM:SS)
    const aulasInfo: Array<{ titulo: string; duracao: string | null }> = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
      const out: Array<{ titulo: string; duracao: string | null }> = [];
      for (const b of btns) {
        const label = (b.getAttribute('aria-label') || b.textContent || '').trim();
        // formato tipico: "Titulo da aula 00:15:22"
        const dur = label.match(/(\d{2}:\d{2}(?::\d{2})?)\s*$/);
        if (dur && !/\baulas\b/i.test(label)) {
          const duracao = dur[1];
          const titulo = label.slice(0, label.length - duracao.length).trim();
          if (titulo) out.push({ titulo, duracao });
        }
      }
      return out;
    });

    const moduloCap: ModuloCapturado = {
      ordem: mod.ordem,
      titulo: mod.titulo,
      slug: mod.slug,
      totalAulas: aulasInfo.length,
      aulas: [],
    };

    // 3) Iterar aulas do modulo --------------------------------------------
    for (let i = 0; i < aulasInfo.length; i++) {
      const info = aulasInfo[i];
      const capturado: { url: string; json: TrechoTranscricao[] } | null =
        await capturarTranscricaoDaAula(page, info.titulo);

      let lessonId: string | null = null;
      let slug: string | null = null;
      if (capturado) {
        const mId = capturado.url.match(/\/lessons\/([0-9a-fA-F-]{36})\/transcription/);
        lessonId = mId ? mId[1] : null;
      }
      const urlAtual: string = page.url();
      const mSlug = urlAtual.match(/\/aula\/([^/?#]+)/);
      slug = mSlug ? mSlug[1] : null;

      moduloCap.aulas.push({
        ordem: i + 1,
        titulo: info.titulo,
        duracao: info.duracao,
        lessonId,
        slug,
        trechos: capturado ? capturado.json : [],
        erro: capturado ? undefined : 'transcricao_nao_capturada',
      });
    }

    resultado.modulos.push(moduloCap);
  }

  return resultado;
}

/**
 * Abre uma aula pelo titulo (clicando na sidebar), abre a aba "Transcricao" e
 * captura a resposta do endpoint /lessons/{id}/transcription.
 */
async function capturarTranscricaoDaAula(
  page: any,
  tituloAula: string,
): Promise<{ url: string; json: TrechoTranscricao[] } | null> {
  const captured: Array<{ url: string; json: TrechoTranscricao[] }> = [];
  const handler = async (response: any) => {
    const url = response.url();
    if (url.includes('/transcription') && response.status() === 200) {
      try {
        const json = await response.json();
        if (Array.isArray(json)) captured.push({ url, json });
      } catch { /* ignora respostas nao-json */ }
    }
  };
  page.on('response', handler);

  try {
    // Escapar regex do titulo para casar exatamente o inicio do nome do botao
    const escapado = tituloAula.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const aulaBtn = page.getByRole('button', { name: new RegExp(escapado) }).first();
    await aulaBtn.click();
    await page.waitForTimeout(1500);

    const tab = page.getByRole('tab', { name: 'Transcrição' });
    await tab.click();

    // aguarda a resposta chegar (ate 10s)
    let waited = 0;
    while (captured.length === 0 && waited < 10000) {
      await page.waitForTimeout(500);
      waited += 500;
    }
  } catch {
    /* segue para o finally e retorna o que tiver */
  } finally {
    page.off('response', handler);
  }

  return captured.length ? captured[captured.length - 1] : null;
}
