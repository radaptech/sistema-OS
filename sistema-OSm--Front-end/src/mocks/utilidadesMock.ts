// Infraestrutura genérica do modo mock — nada aqui conhece regra de negócio de domínio
// (isso fica em regrasMock.ts e em mocks/rotas/*).
import type { RespostaPaginada } from '../tipos/paginacao'

export type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ContextoRota {
  params: string[]
  query: URLSearchParams
  corpo: unknown
}

export interface Rota {
  metodo: MetodoHttp
  // Grupos capturados viram ctx.params, na ordem em que aparecem no padrão.
  padrao: RegExp
  tratar: (contexto: ContextoRota) => Promise<Response> | Response
}

const CHAVE_SESSAO = 'mock:sessaoUsuarioId'

export function obterIdSessao(): number | null {
  const valor = sessionStorage.getItem(CHAVE_SESSAO)
  return valor ? Number(valor) : null
}

export function definirIdSessao(id: number | null): void {
  if (id === null) {
    sessionStorage.removeItem(CHAVE_SESSAO)
    return
  }

  sessionStorage.setItem(CHAVE_SESSAO, String(id))
}

// Simula latência de rede para o loading state das telas não parecer instantâneo demais.
export function atraso(): Promise<void> {
  const ms = 250 + Math.random() * 300
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function responderJson<T>(dados: T, status = 200): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function responderErro(mensagem: string, status = 400): Response {
  return responderJson({ erro: mensagem }, status)
}

export function responderBlob(blob: Blob, status = 200): Response {
  return new Response(blob, {
    status,
    headers: { 'content-type': blob.type || 'application/octet-stream' },
  })
}

export function gerarId(colecao: { id: number }[]): number {
  return colecao.reduce((maior, item) => Math.max(maior, item.id), 0) + 1
}

export function paginarLista<T>(itens: T[], pagina = 1, tamanho = 10): RespostaPaginada<T> {
  const total = itens.length
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho))
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas)
  const inicio = (paginaAtual - 1) * tamanho

  return {
    dados: itens.slice(inicio, inicio + tamanho),
    pagina: paginaAtual,
    totalPaginas,
    total,
  }
}

// Endpoints com upload mandam a parte "dados" (JSON) + arquivos (foto/video) — ver
// montarMultipart.ts no lado real. Endpoints sem upload mandam o corpo já como objeto.
export function extrairCorpo(corpo: unknown): {
  dados: Record<string, unknown>
  arquivos: FormData | null
} {
  if (corpo instanceof FormData) {
    const bruto = corpo.get('dados')
    const dados = typeof bruto === 'string' ? JSON.parse(bruto) : {}
    return { dados, arquivos: corpo }
  }

  return { dados: (corpo as Record<string, unknown>) ?? {}, arquivos: null }
}

// Sem upload real: o arquivo vira um object URL válido pelo tempo da aba, o suficiente
// para o preview/anexo funcionar durante a demonstração.
export function urlArquivoEnviado(arquivos: FormData | null, campo: string): string | undefined {
  const arquivo = arquivos?.get(campo)
  return arquivo instanceof File && arquivo.size > 0 ? URL.createObjectURL(arquivo) : undefined
}

// Placeholder determinístico (sem dependência de rede) para fotos de máquina/anexos do
// banco mock — um SVG com o rótulo do item, para toda tela com <img> continuar legível.
export function marcadorFoto(rotulo: string, corFundo = '#94a3b8'): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320">` +
    `<rect width="100%" height="100%" fill="${corFundo}"/>` +
    `<text x="50%" y="50%" fill="#1f2937" font-family="sans-serif" font-size="22" ` +
    `text-anchor="middle" dominant-baseline="middle">${rotulo}</text></svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
