import { useState } from 'react'
import { ChevronDown, Cog, Layers, X } from 'lucide-react'
import { MiniaturaFoto } from '../../../componentes/MiniaturaFoto'
import { useMaquinasDasMinhasSolicitacoes } from '../../../hooks/useMaquinasDasMinhasSolicitacoes'
import { FolhaMaquinas } from './FolhaMaquinas'

interface FiltroMaquinasProps {
  maquinaSelecionada?: number
  aoSelecionar: (maquinaId: number | undefined) => void
}

// "De qual máquina". A tela do Solicitante é usada quase só no celular, então o filtro é
// uma linha só — um botão de largura total com a máquina escolhida — que abre uma folha
// inferior com a lista em linhas grandes (foto, nome, patrimônio). A primeira versão era
// uma fileira de chips com rolagem lateral: no celular escondia a maior parte das
// máquinas e os alvos de toque ficavam pequenos.
//
// As opções são as máquinas das solicitações do próprio Solicitante
// (GET /solicitacoes/minhas/maquinas), não as do setor dele: máquina desativada ou de um
// setor antigo continua no histórico, e nenhuma opção leva a uma lista vazia.
export function FiltroMaquinas({ maquinaSelecionada, aoSelecionar }: FiltroMaquinasProps) {
  const { data: maquinas = [] } = useMaquinasDasMinhasSolicitacoes()
  const [folhaAberta, setFolhaAberta] = useState(false)

  if (maquinas.length === 0) {
    return null
  }

  const escolhida = maquinas.find((maquina) => maquina.id === maquinaSelecionada)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
        Máquina
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setFolhaAberta(true)}
          className={`flex min-h-[52px] min-w-0 flex-1 items-center gap-3 rounded-xl border bg-white px-2.5 py-1.5 text-left transition ${
            escolhida ? 'border-marca-500' : 'border-slate-200/60'
          }`}
        >
          {escolhida ? (
            <MiniaturaFoto
              fotoUrl={escolhida.fotoUrl}
              alt=""
              Icone={Cog}
              className="h-9 w-9 rounded-lg"
              tamanhoIcone={16}
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Layers size={16} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-800">
              {escolhida ? escolhida.nome : 'Todas as máquinas'}
            </span>
            <span className="block truncate font-mono text-xs text-slate-500">
              {escolhida
                ? escolhida.numeroPatrimonio && `Patrimônio ${escolhida.numeroPatrimonio}`
                : `${maquinas.length} ${maquinas.length === 1 ? 'máquina' : 'máquinas'} · toque para escolher`}
            </span>
          </span>
          <ChevronDown size={18} className="shrink-0 text-slate-400" />
        </button>

        {/* Limpar fica fora do botão principal (botão dentro de botão não é válido) e do
            tamanho de um alvo de toque. */}
        {escolhida && (
          <button
            type="button"
            aria-label="Mostrar todas as máquinas"
            onClick={() => aoSelecionar(undefined)}
            className="flex w-[52px] shrink-0 items-center justify-center rounded-xl border border-slate-200/60 bg-white text-slate-500 transition hover:text-slate-700"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {folhaAberta && (
        <FolhaMaquinas
          maquinas={maquinas}
          maquinaSelecionada={maquinaSelecionada}
          aoSelecionar={aoSelecionar}
          aoFechar={() => setFolhaAberta(false)}
        />
      )}
    </div>
  )
}
