import {
  converterDataBackend,
  agoraParaBackend,
} from '../../utilitarios/dataBackend'
import type { Notificacao } from '../../tipos/notificacao'
import { obterUsuarioSessao } from '../bancoMock'
import {
  notificacoes,
  semearNotificacoes,
  type NotificacaoInterna,
} from '../notificacoesMock'
import {
  atraso,
  paginarLista,
  responderErro,
  responderJson,
  type Rota,
} from '../utilidadesMock'

// Mesmo tamanho de página do back (TamanhoPaginaNotificacoes).
const TAMANHO_PAGINA = 20

semearNotificacoes()

function doUsuario(usuarioId: number): NotificacaoInterna[] {
  return notificacoes.filter(
    (notificacao) => notificacao.usuarioId === usuarioId,
  )
}

function contarNaoLidas(usuarioId: number) {
  return {
    total: doUsuario(usuarioId).filter((notificacao) => !notificacao.lida)
      .length,
  }
}

// Sem o usuarioId interno: a resposta do back não tem dono (é sempre o do token).
function semDono(notificacao: NotificacaoInterna): Notificacao {
  const { id, tipo, titulo, corpo, url, lida, lidaEm, criadoEm } = notificacao
  return { id, tipo, titulo, corpo, url, lida, lidaEm, criadoEm }
}

function marcar(notificacao: NotificacaoInterna) {
  // Não reescreve a hora da primeira leitura (COALESCE no back).
  if (!notificacao.lida) {
    notificacao.lida = true
    notificacao.lidaEm = agoraParaBackend()
  }
}

export const rotasNotificacoes: Rota[] = [
  {
    metodo: 'GET',
    padrao: /^\/notificacoes$/,
    async tratar({ query }) {
      await atraso()
      const usuario = obterUsuarioSessao()
      if (!usuario) {
        return responderErro('Não autenticado.', 401)
      }

      // Mais novas primeiro; no empate, a criada por último (id DESC, como no back).
      const ordenadas = [...doUsuario(usuario.id)].sort(
        (a, b) =>
          converterDataBackend(b.criadoEm).getTime() -
            converterDataBackend(a.criadoEm).getTime() || b.id - a.id,
      )

      const pagina = Number(query.get('pagina') ?? '1')
      const resposta = paginarLista(
        ordenadas.map(semDono),
        pagina,
        TAMANHO_PAGINA,
      )
      return responderJson(resposta)
    },
  },
  {
    metodo: 'GET',
    padrao: /^\/notificacoes\/nao-lidas$/,
    async tratar() {
      const usuario = obterUsuarioSessao()
      if (!usuario) {
        return responderErro('Não autenticado.', 401)
      }
      return responderJson(contarNaoLidas(usuario.id))
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/notificacoes\/lidas$/,
    async tratar() {
      await atraso()
      const usuario = obterUsuarioSessao()
      if (!usuario) {
        return responderErro('Não autenticado.', 401)
      }
      doUsuario(usuario.id).forEach(marcar)
      return responderJson(contarNaoLidas(usuario.id))
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/notificacoes\/(\d+)\/lida$/,
    async tratar({ params }) {
      const usuario = obterUsuarioSessao()
      if (!usuario) {
        return responderErro('Não autenticado.', 401)
      }
      // De outro usuário é 404, igual a inexistente.
      const notificacao = doUsuario(usuario.id).find(
        (item) => item.id === Number(params[0]),
      )
      if (!notificacao) {
        return responderErro('notificação não encontrada', 404)
      }
      marcar(notificacao)
      return responderJson(contarNaoLidas(usuario.id))
    },
  },
]
