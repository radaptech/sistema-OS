import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEstadoAutenticacao } from '../estado/estadoAutenticacao'
import { servicoNotificacoes } from '../servicos/servicoNotificacoes'

export const CHAVE_NAO_LIDAS = ['notificacoes-nao-lidas'] as const
export const CHAVE_LISTA_NOTIFICACOES = ['notificacoes'] as const

// Intervalo da checagem do número do sininho. É a rede de segurança de quem está com o
// app aberto e não recebe push: um GET de contagem (índice parcial no banco) por
// minuto por aba visível é barato. O navegador pausa o intervalo com a aba em segundo
// plano (refetchIntervalInBackground fica no padrão, false).
const INTERVALO_CONTAGEM_MS = 60_000

// O número do sininho. Diferente do resto do app (App.tsx desliga), aqui o foco da
// janela REFAZ a busca: voltar pro app depois de ver o push no celular tem que mostrar
// o número novo na hora, não daqui a um minuto.
export function useContagemNaoLidas() {
  const autenticado = useEstadoAutenticacao((estado) => estado.autenticado)

  return useQuery({
    queryKey: CHAVE_NAO_LIDAS,
    queryFn: servicoNotificacoes.contarNaoLidas,
    enabled: autenticado,
    staleTime: 0,
    refetchInterval: INTERVALO_CONTAGEM_MS,
    refetchOnWindowFocus: true,
  })
}

// A lista do painel do sininho, 20 por página com "carregar mais". Só busca com o
// painel aberto, e sempre de novo ao abrir (staleTime 0): o número pode ter mudado
// desde a última vez, e a lista tem que bater com ele.
export function useListaNotificacoes(habilitado: boolean) {
  return useInfiniteQuery({
    queryKey: CHAVE_LISTA_NOTIFICACOES,
    queryFn: ({ pageParam }) => servicoNotificacoes.listar(pageParam),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina < ultima.totalPaginas ? ultima.pagina + 1 : undefined,
    enabled: habilitado,
    staleTime: 0,
  })
}
