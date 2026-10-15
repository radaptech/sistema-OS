import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, Cog, Layers, X } from 'lucide-react'
import { MiniaturaFoto } from '../../../componentes/MiniaturaFoto'
import { useSaidaAnimada } from '../../../hooks/useSaidaAnimada'
import type { MaquinaDasMinhasSolicitacoes } from '../../../tipos/maquina'

interface FolhaMaquinasProps {
  maquinas: MaquinaDasMinhasSolicitacoes[]
  maquinaSelecionada?: number
  aoSelecionar: (maquinaId: number | undefined) => void
  aoFechar: () => void
}

// Folha inferior (bottom sheet) com as máquinas, uma por linha: a lista fica perto do
// polegar e cada linha é um alvo de toque inteiro. No desktop vira um cartão centralizado.
// Escolher já fecha — não há "aplicar", a escolha é uma só.
export function FolhaMaquinas({
  maquinas,
  maquinaSelecionada,
  aoSelecionar,
  aoFechar,
}: FolhaMaquinasProps) {
  const idTitulo = useId()
  const { fechar, classeFundo, classeCartao } = useSaidaAnimada(aoFechar, {
    variante: 'folha',
  })

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        fechar()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [fechar])

  function escolher(maquinaId: number | undefined) {
    aoSelecionar(maquinaId)
    fechar()
  }

  return createPortal(
    <div
      onClick={fechar}
      className={`${classeFundo} fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(evento) => evento.stopPropagation()}
        className={`${classeCartao} shadow-pop flex max-h-[80svh] w-full max-w-md flex-col rounded-t-3xl bg-white sm:rounded-3xl`}
      >
        {/* Alça: o sinal visual de "folha" que se fecha puxando/tocando fora. */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2
            id={idTitulo}
            className="font-display text-base font-bold tracking-wide text-slate-900"
          >
            Escolha a máquina
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <ul className="flex flex-col gap-1 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <li>
            <LinhaMaquina
              ativa={maquinaSelecionada === undefined}
              aoEscolher={() => escolher(undefined)}
              miniatura={
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <Layers size={20} />
                </span>
              }
              titulo="Todas as máquinas"
              subtitulo="Inclui os pequenos reparos"
            />
          </li>
          {maquinas.map((maquina) => (
            <li key={maquina.id}>
              <LinhaMaquina
                ativa={maquina.id === maquinaSelecionada}
                aoEscolher={() => escolher(maquina.id)}
                miniatura={
                  <MiniaturaFoto
                    fotoUrl={maquina.fotoUrl}
                    alt=""
                    Icone={Cog}
                    className="h-12 w-12 rounded-xl"
                    tamanhoIcone={20}
                  />
                }
                titulo={maquina.nome}
                subtitulo={
                  maquina.numeroPatrimonio ? `Patrimônio ${maquina.numeroPatrimonio}` : undefined
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}

interface LinhaMaquinaProps {
  ativa: boolean
  aoEscolher: () => void
  miniatura: ReactNode
  titulo: string
  subtitulo?: string
}

function LinhaMaquina({ ativa, aoEscolher, miniatura, titulo, subtitulo }: LinhaMaquinaProps) {
  return (
    <button
      type="button"
      aria-pressed={ativa}
      onClick={aoEscolher}
      className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition active:scale-[0.99] ${
        ativa ? 'bg-marca-100' : 'hover:bg-slate-50'
      }`}
    >
      {miniatura}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-800">{titulo}</span>
        {subtitulo && (
          <span className="block truncate font-mono text-xs text-slate-500">{subtitulo}</span>
        )}
      </span>
      {ativa && (
        <span className="bg-marca-600 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
