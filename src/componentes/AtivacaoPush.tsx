import { BellOff, BellRing, Check, Share, SquarePlus } from 'lucide-react'
import type { EstadoPush } from '../hooks/usePush'

interface AvisoAtivarPushProps {
  estado: EstadoPush
  processando: boolean
  // O navegador recusou a inscrição (não a permissão): sem a linha de explicação, o
  // clique em "Ativar" voltava para "Ativar" sem dizer nada.
  falhaNavegador?: boolean
  aoAtivar: () => void
}

// O topo do painel do sininho enquanto o push NÃO está ativo neste aparelho: o botão
// (a permissão só pode ser pedida num clique, então nunca é pedida sozinha ao abrir o
// app), o passo a passo do iPhone ou como desbloquear. Ativo, não ocupa espaço aqui --
// vira o RodapePushAtivo.
export function AvisoAtivarPush({
  estado,
  processando,
  falhaNavegador = false,
  aoAtivar,
}: AvisoAtivarPushProps) {
  if (estado === 'desativado') {
    return (
      <div className="flex items-center gap-3 border-b border-slate-200/60 bg-slate-50 px-4 py-3">
        <span className="bg-marca-100 text-marca-800 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
          <BellRing size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">
            Receber avisos neste aparelho
          </p>
          <p className="text-xs text-slate-500">Mesmo com o app fechado.</p>
          {falhaNavegador && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              Este navegador não deixou ativar. Em aba anônima não funciona: abra no
              navegador normal ou no app instalado e tente de novo.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={aoAtivar}
          disabled={processando}
          className="bg-marca-600 shadow-marca-600/20 h-9 w-24 shrink-0 rounded-xl text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-60"
        >
          {processando ? 'Ativando...' : 'Ativar'}
        </button>
      </div>
    )
  }

  if (estado === 'instalar') {
    return (
      <div className="border-b border-slate-200/60 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">
          Para receber avisos no iPhone
        </p>
        <p className="mb-2 text-xs text-slate-500">
          O iPhone só entrega notificações com o app na Tela de Início.
        </p>
        <ol className="flex flex-col gap-1.5 text-xs text-slate-600">
          <li className="flex items-center gap-2">
            <Passo numero={1} />
            Toque em <Share size={14} aria-label="Compartilhar" /> Compartilhar
            no Safari
          </li>
          <li className="flex items-center gap-2">
            <Passo numero={2} />
            Escolha <SquarePlus size={14} aria-hidden /> Adicionar à Tela de
            Início
          </li>
          <li className="flex items-center gap-2">
            <Passo numero={3} />
            Abra pelo ícone novo e ative aqui no sininho
          </li>
        </ol>
      </div>
    )
  }

  if (estado === 'bloqueado') {
    return (
      <div className="flex gap-3 border-b border-slate-200/60 bg-slate-50 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <BellOff size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">
            Notificações bloqueadas neste aparelho
          </p>
          <p className="text-xs text-slate-500">
            Só dá pra liberar nas configurações. No navegador: toque no cadeado
            ao lado do endereço › Notificações › Permitir. No app instalado:
            configurações do celular › Apps › Solicitação OS › Notificações.
            Depois, volte aqui e ative.
          </p>
        </div>
      </div>
    )
  }

  return null
}

function Passo({ numero }: { numero: number }) {
  return (
    <span className="shadow-card flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white font-mono text-[10px] font-bold text-slate-500">
      {numero}
    </span>
  )
}

interface RodapePushAtivoProps {
  processando: boolean
  aoDesativar: () => void
}

// Push ativo: uma linha discreta no pé do painel, com o caminho de volta.
export function RodapePushAtivo({
  processando,
  aoDesativar,
}: RodapePushAtivoProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200/60 px-4 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Check size={14} className="text-marca-600" />
        Avisos ativos neste aparelho
      </p>
      <button
        type="button"
        onClick={aoDesativar}
        disabled={processando}
        className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
      >
        Desativar
      </button>
    </div>
  )
}
