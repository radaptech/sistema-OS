import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useEstadoAutenticacao } from '../estado/estadoAutenticacao'
import { servicoNotificacoes } from '../servicos/servicoNotificacoes'
import { servicoPush } from '../servicos/servicoPush'
import type { ContagemNaoLidas } from '../tipos/notificacao'
import {
  consumirNotificacaoPendente,
  guardarNotificacaoPendente,
} from '../utilitarios/notificacaoDoPush'
import {
  definirNumeroNoIcone,
  inscreverNoNavegador,
  limparNotificacoesExibidas,
  navegadorSuportaPush,
  obterInscricaoAtual,
} from '../utilitarios/pushNavegador'
import {
  CHAVE_LISTA_NOTIFICACOES,
  CHAVE_NAO_LIDAS,
  useContagemNaoLidas,
} from './useNotificacoes'
import { CHAVE_CONFIGURACAO_PUSH } from './usePush'

// Mensagens que o public/sw.js manda pras abas abertas.
type MensagemServiceWorker =
  | { tipo: 'PUSH_RECEBIDO' }
  | { tipo: 'ABRIR_NOTIFICACAO'; id: number; url: string }
  | { tipo: 'INSCRICAO_MUDOU' }

// Mesmo efeito do clique no sininho: grava a contagem nova e repinta a lista. O erro
// (raro: 404 se quem logou depois do toque é outra pessoa) já vira toast no api.ts.
function marcarLida(clienteQuery: QueryClient, id: number) {
  servicoNotificacoes
    .marcarLida(id)
    .then((nova: ContagemNaoLidas) => {
      clienteQuery.setQueryData(CHAVE_NAO_LIDAS, nova)
      return clienteQuery.invalidateQueries({
        queryKey: CHAVE_LISTA_NOTIFICACOES,
      })
    })
    .catch(() => {})
}

// Manda de novo pro servidor a inscrição que este navegador já tem (upsert pelo
// endpoint: idempotente). Sem permissão concedida não há o que reenviar -- e daqui nunca
// se pede permissão: fora de um clique o navegador ignora, e pedir sozinho é o que faz o
// usuário negar.
function reenviarInscricao(clienteQuery: QueryClient) {
  if (!navegadorSuportaPush() || Notification.permission !== 'granted') {
    return
  }
  ;(async () => {
    if (!(await obterInscricaoAtual())) {
      return
    }
    const { chavePublica } = await clienteQuery.fetchQuery({
      queryKey: CHAVE_CONFIGURACAO_PUSH,
      queryFn: servicoPush.obterChavePublica,
      staleTime: Infinity,
    })
    if (!chavePublica) {
      return
    }
    // Refaz no navegador se a chave do servidor mudou (inscreverNoNavegador cuida).
    const inscricao = await inscreverNoNavegador(chavePublica)
    if (inscricao) {
      await servicoPush.inscrever(inscricao)
    }
  })().catch(() => {})
}

// A ponte entre o push (sw.js, que roda fora da página) e o app aberto. Montado uma vez,
// no PortaoSessao:
// - número no ícone do app = não lidas do sininho, sempre que a contagem muda;
// - push chegou com o app aberto -> o sininho busca de novo na hora (não em 60s);
// - toque na notificação com o app aberto -> marca como lida e navega SEM recarregar;
// - toque com o app fechado -> o id veio na URL (notificacaoDoPush.ts) e é marcado aqui;
// - ao entrar (e quando o navegador renova a inscrição), reenvia a deste aparelho: o servidor pode ter perdido a linha
//   (410, banco recriado) e, se outra pessoa usava o aparelho, o dono passa a ser quem
//   entrou (upsert pelo endpoint no back).
export function useIntegracaoPush() {
  const navegar = useNavigate()
  const clienteQuery = useQueryClient()
  const autenticado = useEstadoAutenticacao((estado) => estado.autenticado)
  const usuarioId = useEstadoAutenticacao((estado) => estado.usuarioId)
  const { data: contagem } = useContagemNaoLidas()
  const naoLidas = contagem?.total

  useEffect(() => {
    if (naoLidas === undefined) {
      return
    }
    definirNumeroNoIcone(naoLidas)
    // Tudo lido no app: os avisos da bandeja já não dizem nada novo.
    if (naoLidas === 0) {
      limparNotificacoesExibidas()
    }
  }, [naoLidas])

  // Com o app fechado o id veio na URL; marca assim que a sessão estiver de pé.
  useEffect(() => {
    if (!autenticado) {
      return
    }
    const pendente = consumirNotificacaoPendente()
    if (pendente !== null) {
      marcarLida(clienteQuery, pendente)
    }
  }, [autenticado, clienteQuery])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    // A sessão é lida na hora da mensagem, não fechada no efeito: o ouvinte vive o app
    // inteiro, atravessando login e logout.
    function aoReceberMensagem(evento: MessageEvent<MensagemServiceWorker>) {
      const mensagem = evento.data
      const logado = useEstadoAutenticacao.getState().autenticado

      if (mensagem?.tipo === 'PUSH_RECEBIDO' && logado) {
        clienteQuery.invalidateQueries({ queryKey: CHAVE_NAO_LIDAS })
        clienteQuery.invalidateQueries({ queryKey: CHAVE_LISTA_NOTIFICACOES })
      }

      if (mensagem?.tipo === 'ABRIR_NOTIFICACAO') {
        // Deslogado, guarda pra depois do login (a RotaProtegida leva ao /login).
        if (logado) {
          marcarLida(clienteQuery, mensagem.id)
        } else {
          guardarNotificacaoPendente(mensagem.id)
        }
        navegar(mensagem.url)
      }

      if (mensagem?.tipo === 'INSCRICAO_MUDOU' && logado) {
        reenviarInscricao(clienteQuery)
      }
    }

    navigator.serviceWorker.addEventListener('message', aoReceberMensagem)
    return () =>
      navigator.serviceWorker.removeEventListener('message', aoReceberMensagem)
  }, [clienteQuery, navegar])

  useEffect(() => {
    if (autenticado && usuarioId !== null) {
      reenviarInscricao(clienteQuery)
    }
  }, [autenticado, usuarioId, clienteQuery])
}
