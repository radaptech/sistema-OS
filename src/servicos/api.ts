import { toast } from 'react-toastify'
import { simularFetch } from '../mocks/apiMock'
import { marcarSessaoExpirada, montarUrlLogin } from '../utilitarios/destinoLogin'

declare const process: { env: Record<string, string | undefined> }

// Modo alternável (ver CLAUDE.md): sem back-end disponível, VITE_USE_MOCKS troca o
// fetch real por src/mocks/apiMock.ts, mantendo intacta a lógica de erro/401/blob abaixo.
const USAR_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

// Fallback de quando REACT_APP_URL_API não é definida. Tem que ficar no mesmo
// domínio registrável do front (*.radaptech.com.br): o cookie de sessão é
// SameSite=Lax, então apontar para outro domínio faz o navegador descartar o
// cookie depois de um login que respondeu 200 -- login em loop, sem erro visível.
const URL_PADRAO_API = 'sistemaos-backend.radaptech.com.br/api'

const CHAVES_ERRO_BACKEND = ['error', 'erro', 'message', 'detalhes'] as const

// Sem isso, uma conexão que trava (não só demora) prende o fetch pra sempre --
// isPending do useSessao nunca vira false, e PortaoSessao fica em "Carregando
// sessão..." indefinidamente, sem erro, sem botão, sem saída (achado
// 23/08/2026: um pico de tráfego bastou pra travar a tela pra um usuário real).
// 20s é folgado o bastante pra nunca falsear um request só lento de verdade.
const TIMEOUT_REQUISICAO_MS = 20_000

type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface OpcoesRequisicao {
  metodo?: MetodoHttp
  corpo?: unknown
  cabecalhos?: Record<string, string>
}

type TipoConteudoResposta = 'json' | 'blob' | 'texto'

function obterUrlBase(): string {
  const urlConfigurada = process.env.REACT_APP_URL_API

  if (!urlConfigurada) {
    return URL_PADRAO_API
  }

  // Começando com "/" é caminho de mesma origem (dev atrás do proxy reverso:
  // REACT_APP_URL_API=/api). Sem isto o https:// seria forçado e viraria "https:///api".
  if (urlConfigurada.startsWith('/')) {
    return urlConfigurada
  }

  return /^https?:\/\//i.test(urlConfigurada)
    ? urlConfigurada
    : `https://${urlConfigurada}`
}

function obterTenantId(): string {
  return window.location.hostname.split('.')[0]
}

function inferirTipoConteudoResposta(resposta: Response): TipoConteudoResposta {
  const contentType = resposta.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return 'json'
  }

  if (
    contentType.includes('application/pdf') ||
    contentType.includes('application/octet-stream') ||
    contentType.startsWith('image/')
  ) {
    return 'blob'
  }

  return 'texto'
}

function extrairMensagemErro(corpoResposta: unknown): string | null {
  if (!corpoResposta || typeof corpoResposta !== 'object') {
    return null
  }

  for (const chave of CHAVES_ERRO_BACKEND) {
    const valor = (corpoResposta as Record<string, unknown>)[chave]
    if (typeof valor === 'string' && valor.trim().length > 0) {
      return valor
    }
  }

  return null
}

// A sessão morreu no meio do uso (prazo, senha trocada, usuário desativado). Recarrega no
// login — o estado do app inteiro é de quem estava logado — e leva na URL o motivo e a
// página atual, para a tela explicar e devolver a pessoa ao mesmo lugar depois de entrar.
// Sem toast: o recarregamento o apagaria antes de alguém ler.
function redirecionarParaLogin(): void {
  window.location.href = montarUrlLogin(window.location.pathname + window.location.search, true)
}

// 401 com este código = havia sessão e ela não vale mais; sem código = nunca houve.
function ehSessaoExpirada(corpoResposta: unknown): boolean {
  return (
    !!corpoResposta &&
    typeof corpoResposta === 'object' &&
    (corpoResposta as Record<string, unknown>).codigo === 'sessao_expirada'
  )
}

async function lerCorpoResposta(
  resposta: Response,
): Promise<{ tipo: TipoConteudoResposta; dados: unknown }> {
  const tipo = inferirTipoConteudoResposta(resposta)

  if (tipo === 'json') {
    const dados = await resposta.json().catch(() => null)
    return { tipo, dados }
  }

  if (tipo === 'blob') {
    const dados = await resposta.blob()
    return { tipo, dados }
  }

  const dados = await resposta.text()
  return { tipo, dados }
}

async function requisitar<T = unknown>(
  endpoint: string,
  opcoes: OpcoesRequisicao = {},
): Promise<T> {
  const { metodo = 'GET', corpo, cabecalhos = {} } = opcoes
  const ehFormData = corpo instanceof FormData

  const cabecalhosFinais: Record<string, string> = {
    'X-tenant-ID': obterTenantId(),
    ...cabecalhos,
  }

  if (!ehFormData) {
    cabecalhosFinais['Content-Type'] = 'application/json'
  }

  let resposta: Response

  try {
    resposta = USAR_MOCKS
      ? await simularFetch(endpoint, metodo, corpo)
      : await fetch(`${obterUrlBase()}${endpoint}`, {
          method: metodo,
          credentials: 'include',
          headers: cabecalhosFinais,
          signal: AbortSignal.timeout(TIMEOUT_REQUISICAO_MS),
          body:
            corpo === undefined
              ? undefined
              : ehFormData
                ? (corpo as FormData)
                : JSON.stringify(corpo),
        })
  } catch {
    const mensagem = 'Não foi possível conectar ao servidor. Verifique sua conexão.'
    toast.error(mensagem)
    throw new Error(mensagem)
  }

  const { dados } = await lerCorpoResposta(resposta)

  if (!resposta.ok) {
    // GET /autenticacao/sessao devolve 401 toda vez que não há sessão ainda --
    // é o caminho normal de quem nunca logou (bootstrap do PortaoSessao, toda
    // carga da tela de login), não um erro. useSessao já trata via retry:false;
    // aqui só falta não estourar o toast genérico abaixo pra esse caso. Se havia uma
    // sessão e ela venceu, a tela de login vai dizer isso (destinoLogin.ts).
    if (resposta.status === 401 && endpoint === '/autenticacao/sessao') {
      if (ehSessaoExpirada(dados)) {
        marcarSessaoExpirada()
      }
      throw new Error('Sem sessão.')
    }

    const estaNaTelaLogin = window.location.pathname === '/login'

    if (resposta.status === 401 && !estaNaTelaLogin) {
      redirecionarParaLogin()
      throw new Error('Sessão expirada.')
    }

    // Só 5xx: é o erro que o usuário não resolve sozinho, e o código leva o
    // suporte direto às linhas desse request no log do back (X-Request-ID).
    const codigo = resposta.status >= 500 ? resposta.headers.get('X-Request-ID') : null
    const mensagemErro =
      (extrairMensagemErro(dados) ?? 'Ocorreu um erro inesperado. Tente novamente.') +
      (codigo ? ` (código: ${codigo})` : '')
    toast.error(mensagemErro)
    throw new Error(mensagemErro)
  }

  return dados as T
}

export const api = {
  get: <T = unknown>(endpoint: string, cabecalhos?: Record<string, string>) =>
    requisitar<T>(endpoint, { metodo: 'GET', cabecalhos }),

  post: <T = unknown>(
    endpoint: string,
    corpo?: unknown,
    cabecalhos?: Record<string, string>,
  ) => requisitar<T>(endpoint, { metodo: 'POST', corpo, cabecalhos }),

  put: <T = unknown>(
    endpoint: string,
    corpo?: unknown,
    cabecalhos?: Record<string, string>,
  ) => requisitar<T>(endpoint, { metodo: 'PUT', corpo, cabecalhos }),

  patch: <T = unknown>(
    endpoint: string,
    corpo?: unknown,
    cabecalhos?: Record<string, string>,
  ) => requisitar<T>(endpoint, { metodo: 'PATCH', corpo, cabecalhos }),

  delete: <T = unknown>(endpoint: string, cabecalhos?: Record<string, string>) =>
    requisitar<T>(endpoint, { metodo: 'DELETE', cabecalhos }),
}
