import {
  BellOff,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Inbox,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useListaNotificacoes } from '../hooks/useNotificacoes'
import type { Notificacao, TipoNotificacao } from '../tipos/notificacao'
import { tempoRelativo } from '../utilitarios/tempoRelativo'
import { Esqueleto } from './Esqueleto'

// Ícone e tinta por evento -- mesmo formato tingido dos badges. Só pares que o bloco
// escuro do index.css inverte (sky/violet e text-marca-700 não estão lá e sairiam
// escuro sobre escuro).
const VISUAL_POR_TIPO: Record<
  TipoNotificacao,
  { Icone: LucideIcon; classe: string }
> = {
  solicitacao_nova: { Icone: Inbox, classe: 'bg-blue-100 text-blue-700' },
  solicitacao_aceita: {
    Icone: CircleCheck,
    classe: 'bg-marca-100 text-marca-800',
  },
  solicitacao_rejeitada: { Icone: CircleX, classe: 'bg-red-100 text-red-700' },
  os_aberta: { Icone: Wrench, classe: 'bg-amber-100 text-amber-700' },
  os_preventiva: {
    Icone: CalendarClock,
    classe: 'bg-orange-100 text-orange-700',
  },
  os_concluida: {
    Icone: ClipboardCheck,
    classe: 'bg-emerald-100 text-emerald-700',
  },
}

interface PainelNotificacoesProps {
  naoLidas: number
  marcandoTodas: boolean
  aoMarcarTodas: () => void
  aoAbrir: (notificacao: Notificacao) => void
}

// O popover do sininho. No celular ocupa a largura toda logo abaixo do cabeçalho (um
// popover de 384px ancorado no botão sairia da tela); do `sm` pra cima ancora no botão.
export function PainelNotificacoes({
  naoLidas,
  marcandoTodas,
  aoMarcarTodas,
  aoAbrir,
}: PainelNotificacoesProps) {
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useListaNotificacoes(true)

  const notificacoes = data?.pages.flatMap((pagina) => pagina.dados) ?? []

  return (
    <div
      role="dialog"
      aria-label="Notificações"
      className="animate-pop-in shadow-pop fixed inset-x-4 top-16 z-50 flex max-h-[75svh] origin-top-right flex-col overflow-hidden rounded-2xl bg-white sm:absolute sm:inset-x-auto sm:top-12 sm:right-0 sm:w-96"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 px-4 py-3">
        <p className="font-display text-base font-bold text-slate-800">
          Notificações
        </p>
        {naoLidas > 0 && (
          <button
            type="button"
            onClick={aoMarcarTodas}
            disabled={marcandoTodas}
            className="text-marca-800 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            <CheckCheck size={14} />
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <ul aria-busy="true" aria-label="Carregando notificações">
            {[0, 1, 2].map((indice) => (
              <li key={indice} className="flex gap-3 px-4 py-3">
                <Esqueleto className="h-9 w-9 shrink-0 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2 py-0.5">
                  <Esqueleto className="h-3.5 w-2/3" />
                  <Esqueleto className="h-3 w-full" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {isError && (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            Não foi possível carregar as notificações.
          </p>
        )}

        {!isLoading && !isError && notificacoes.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
            <BellOff size={26} />
            <p className="text-sm">Nenhuma notificação por enquanto.</p>
          </div>
        )}

        {notificacoes.length > 0 && (
          <ul className="divide-y divide-slate-200/60">
            {notificacoes.map((notificacao) => (
              <li key={notificacao.id}>
                <ItemNotificacao notificacao={notificacao} aoAbrir={aoAbrir} />
              </li>
            ))}
          </ul>
        )}

        {hasNextPage && (
          <div className="border-t border-slate-200/60 p-2">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full rounded-xl py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface ItemNotificacaoProps {
  notificacao: Notificacao
  aoAbrir: (notificacao: Notificacao) => void
}

function ItemNotificacao({ notificacao, aoAbrir }: ItemNotificacaoProps) {
  const { Icone, classe } =
    VISUAL_POR_TIPO[notificacao.tipo] ?? VISUAL_POR_TIPO.solicitacao_nova

  return (
    <button
      type="button"
      onClick={() => aoAbrir(notificacao)}
      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
        notificacao.lida ? '' : 'bg-slate-50'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${classe}`}
      >
        <Icone size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-start justify-between gap-2">
          <span
            className={`text-sm leading-snug ${
              notificacao.lida
                ? 'font-medium text-slate-600'
                : 'font-semibold text-slate-900'
            }`}
          >
            {notificacao.titulo}
          </span>
          {!notificacao.lida && (
            <span
              aria-label="não lida"
              className="bg-marca-600 mt-1.5 h-2 w-2 shrink-0 rounded-full"
            />
          )}
        </span>
        <span className="line-clamp-2 text-xs text-slate-500">
          {notificacao.corpo}
        </span>
        <span className="font-mono text-[10px] tracking-wide text-slate-400 uppercase">
          {tempoRelativo(notificacao.criadoEm)}
        </span>
      </span>
    </button>
  )
}
