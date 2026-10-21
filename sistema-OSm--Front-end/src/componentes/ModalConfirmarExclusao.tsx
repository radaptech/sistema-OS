import { createPortal } from 'react-dom'
import { AlertTriangle, Trash2, XCircle } from 'lucide-react'
import { Botao } from './Botao'
import { useSaidaAnimada } from '../hooks/useSaidaAnimada'
import { useDialogo } from '../hooks/useDialogo'

interface ModalConfirmarExclusaoProps {
  titulo: string
  mensagem: string
  aoConfirmar: () => void
  aoFechar: () => void
  confirmando?: boolean
}

export function ModalConfirmarExclusao({
  titulo,
  mensagem,
  aoConfirmar,
  aoFechar,
  confirmando = false,
}: ModalConfirmarExclusaoProps) {
  const { fechar, classeFundo, classeCartao } = useSaidaAnimada(aoFechar)

  const { propsDialogo, idTitulo } = useDialogo(fechar, { podeFechar: !confirmando })

  return createPortal(
    <div className={`${classeFundo} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`}>
      <div {...propsDialogo} className={`${classeCartao} w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-pop`}>
        <div className="flex items-start justify-between bg-red-600 px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-white" size={20} />
            <p id={idTitulo} className="font-display text-lg font-bold text-white">{titulo}</p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            className="text-white/90 transition hover:text-white"
          >
            <XCircle size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <p className="text-sm text-slate-600">{mensagem}</p>

          <div className="flex gap-3">
            <div className="flex-1">
              <Botao type="button" variante="secundario" onClick={fechar}>
                Cancelar
              </Botao>
            </div>
            <div className="flex-1">
              <Botao
                type="button"
                carregando={confirmando}
                rotuloCarregando="Excluindo..."
                onClick={aoConfirmar}
                className="flex items-center justify-center gap-2 bg-red-600"
              >
                <Trash2 size={16} />
                Excluir
              </Botao>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
