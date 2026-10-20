import type { InscricaoPush } from '../../tipos/push'
import { obterUsuarioSessao } from '../bancoMock'
import { responderErro, responderJson, type Rota } from '../utilidadesMock'

// Chave pública P-256 de verdade (só a pública -- a privada foi jogada fora): o
// pushManager.subscribe do navegador valida o formato, então uma string qualquer faria o
// botão "Ativar" falhar no modo mock. Nada chega por push aqui, mas o fluxo de ativar,
// desativar e sair dá pra ver inteiro.
const CHAVE_PUBLICA_MOCK =
  'BPGy5m1d4uPB5db88wu5ikohqRAOm79CywfDnTo33C-uZBS4Hg-9HM1cD6LAmrcITJDDL7WnV7YMJjm3vMrOgkI'

// endpoint -> dono. Mesmo upsert do back: reinscrever o endpoint troca o dono.
const dispositivos = new Map<string, number>()

function semConteudo() {
  return new Response(null, { status: 204 })
}

export const rotasPush: Rota[] = [
  {
    metodo: 'GET',
    padrao: /^\/push\/chave-publica$/,
    tratar() {
      if (!obterUsuarioSessao()) {
        return responderErro('Não autenticado.', 401)
      }
      return responderJson({ chavePublica: CHAVE_PUBLICA_MOCK })
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/push\/inscricoes$/,
    tratar({ corpo }) {
      const usuario = obterUsuarioSessao()
      if (!usuario) {
        return responderErro('Não autenticado.', 401)
      }
      const inscricao = corpo as Partial<InscricaoPush> | undefined
      if (
        !inscricao?.endpoint ||
        !inscricao.keys?.p256dh ||
        !inscricao.keys.auth
      ) {
        return responderErro('inscrição de push inválida', 400)
      }
      dispositivos.set(inscricao.endpoint, usuario.id)
      return semConteudo()
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/push\/inscricoes\/remover$/,
    tratar({ corpo }) {
      const usuario = obterUsuarioSessao()
      if (!usuario) {
        return responderErro('Não autenticado.', 401)
      }
      const { endpoint } = (corpo ?? {}) as { endpoint?: string }
      // Só o dono desinscreve; idempotente (sempre 204), como no back.
      if (endpoint && dispositivos.get(endpoint) === usuario.id) {
        dispositivos.delete(endpoint)
      }
      return semConteudo()
    },
  },
]
