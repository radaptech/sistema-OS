import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CHAVE_LISTA_NOTIFICACOES,
  CHAVE_NAO_LIDAS,
  useContagemNaoLidas,
} from '../hooks/useNotificacoes'
import { servicoNotificacoes } from '../servicos/servicoNotificacoes'
import type { ContagemNaoLidas, Notificacao } from '../tipos/notificacao'
import { PainelNotificacoes } from './PainelNotificacoes'

// O selo passa a "99+" depois disso: número de três dígitos estoura o círculo.
const LIMITE_SELO = 99

// O sininho dos cabeçalhos: número real de não lidas (some quando é zero) e, ao
// clicar, o painel com a lista. Clicar numa notificação marca como lida e navega pra
// url dela -- é o painel de destino que abre o modal do item (?solicitacao= / ?os=).
export function SinoNotificacoes() {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  const { data: contagem } = useContagemNaoLidas()
  const naoLidas = contagem?.total ?? 0

  // As duas rotas de marcar devolvem a contagem nova: grava direto no cache em vez de
  // buscar de novo, e a lista recarrega pra pintar o item como lido.
  function aoMarcar(nova: ContagemNaoLidas) {
    queryClient.setQueryData(CHAVE_NAO_LIDAS, nova)
    return queryClient.invalidateQueries({ queryKey: CHAVE_LISTA_NOTIFICACOES })
  }

  const { mutate: marcarLida } = useMutation({
    mutationFn: servicoNotificacoes.marcarLida,
    onSuccess: aoMarcar,
  })

  const { mutate: marcarTodasLidas, isPending: marcandoTodas } = useMutation({
    mutationFn: servicoNotificacoes.marcarTodasLidas,
    onSuccess: aoMarcar,
  })

  // Fecha clicando fora ou com Esc -- o painel é um popover, não um modal: não prende o
  // foco nem escurece a tela.
  useEffect(() => {
    if (!aberto) {
      return
    }

    function aoClicarFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) {
        setAberto(false)
      }
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        setAberto(false)
      }
    }

    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  function aoAbrirNotificacao(notificacao: Notificacao) {
    if (!notificacao.lida) {
      marcarLida(notificacao.id)
    }
    setAberto(false)
    navegar(notificacao.url)
  }

  const rotulo =
    naoLidas === 0
      ? 'Notificações'
      : `Notificações, ${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'}`

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-label={rotulo}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        onClick={() => setAberto((valor) => !valor)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 hover:text-slate-700 ${
          aberto ? 'bg-slate-100 text-slate-700' : 'text-slate-400'
        }`}
      >
        <Bell size={20} />
        {naoLidas > 0 && (
          <span className="bg-marca-600 absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] leading-none font-bold text-white">
            {naoLidas > LIMITE_SELO ? `${LIMITE_SELO}+` : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <PainelNotificacoes
          naoLidas={naoLidas}
          marcandoTodas={marcandoTodas}
          aoMarcarTodas={() => marcarTodasLidas()}
          aoAbrir={aoAbrirNotificacao}
        />
      )}
    </div>
  )
}
