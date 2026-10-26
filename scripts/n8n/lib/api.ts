import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEnv, obrigatorio } from './env.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/n8n/lib/ -> scripts/
const SCRIPTS_DIR = path.resolve(__dirname, '..', '..');
export const ENV_PATH = path.join(SCRIPTS_DIR, '.env');

export interface ConfigApi {
  baseUrl: string; // ex.: http://localhost:5678
  apiKey: string;
}

export class ErroApi extends Error {
  constructor(
    public status: number,
    public corpo: string,
    mensagem?: string,
  ) {
    super(mensagem ?? `Requisição à API do n8n falhou: HTTP ${status}`);
    this.name = 'ErroApi';
  }
}

/** Monta a URL completa de um endpoint da Public API (/api/v1/...). */
export function montarUrl(baseUrl: string, caminho: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const c = caminho.startsWith('/') ? caminho : `/${caminho}`;
  return `${base}/api/v1${c}`;
}

/** Cabeçalhos padrão, incluindo a API key. */
export function montarHeaders(apiKey: string): Record<string, string> {
  return {
    'X-N8N-API-KEY': apiKey,
    accept: 'application/json',
    'content-type': 'application/json',
  };
}

/** Lê a configuração da API a partir de scripts/.env (ou de um mapa fornecido). */
export function carregarConfig(
  mapa: Record<string, string | undefined> = lerEnv(ENV_PATH),
): ConfigApi {
  const baseUrl = obrigatorio(mapa, 'N8N_URL', 'Defina em scripts/.env (veja .env.example).');
  const apiKey = obrigatorio(
    mapa,
    'N8N_API_KEY',
    'Crie em Settings → n8n API e preencha scripts/.env.',
  );
  return { baseUrl, apiKey };
}

/**
 * Cliente mínimo da Public API do n8n.
 * `fetchImpl` é injetável para testes.
 */
export class ClienteN8n {
  constructor(
    private config: ConfigApi,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async request<T = unknown>(
    caminho: string,
    init: RequestInit = {},
  ): Promise<T> {
    const url = montarUrl(this.config.baseUrl, caminho);
    const resp = await this.fetchImpl(url, {
      ...init,
      headers: { ...montarHeaders(this.config.apiKey), ...(init.headers ?? {}) },
    });
    const texto = await resp.text();
    if (!resp.ok) {
      let mensagem: string | undefined;
      if (resp.status === 401) mensagem = 'API key inválida ou ausente (HTTP 401).';
      if (resp.status === 404) mensagem = `Endpoint não encontrado: ${caminho} (HTTP 404).`;
      throw new ErroApi(resp.status, texto, mensagem);
    }
    return texto ? (JSON.parse(texto) as T) : (undefined as T);
  }

  /** Lista workflows (paginado); retorna a primeira página por padrão. */
  async listarWorkflows(limite = 50): Promise<{ data: Array<{ id: string; name: string; active: boolean }> }> {
    return this.request(`/workflows?limit=${limite}`);
  }

  /** Busca um workflow por ID. */
  async obterWorkflow(id: string): Promise<unknown> {
    return this.request(`/workflows/${encodeURIComponent(id)}`);
  }
}

/** Cria um cliente a partir de scripts/.env. */
export function criarCliente(fetchImpl: typeof fetch = fetch): ClienteN8n {
  return new ClienteN8n(carregarConfig(), fetchImpl);
}
