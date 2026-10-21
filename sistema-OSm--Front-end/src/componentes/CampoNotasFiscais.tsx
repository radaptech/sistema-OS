import { Plus, Trash2 } from 'lucide-react'
import { CampoTexto } from './CampoTexto'

// Série é string vazia quando o Administrador não preenche, e não `undefined`: input
// controlado com value undefined vira não-controlado e o React reclama no console. O
// servidor converte vazio em ausência (NULLIF na query).
export interface NotaFiscalFormulario {
  numero: string
  serie: string
}

export interface ErroNotaFiscal {
  numero?: string
  serie?: string
}

interface CampoNotasFiscaisProps {
  notas: NotaFiscalFormulario[]
  aoMudar: (notas: NotaFiscalFormulario[]) => void
  erro?: string
  errosPorNota?: (ErroNotaFiscal | undefined)[]
  desabilitado?: boolean
}

// Lista editável de notas fiscais, irmã de CampoItensCusto e pelo mesmo motivo: duas peças
// compradas em lojas diferentes geram dois documentos, e o par número/série que existia
// antes só comportava o primeiro.
//
// Não há vínculo com os itens de custo, e isso é decisão: uma nota só pode cobrir as duas
// peças, e uma peça pode não ter nota nenhuma (estoque próprio), então qualquer amarração
// 1:1 estaria errada metade das vezes.
export function CampoNotasFiscais({
  notas,
  aoMudar,
  erro,
  errosPorNota,
  desabilitado = false,
}: CampoNotasFiscaisProps) {
  function adicionar() {
    aoMudar([...notas, { numero: '', serie: '' }])
  }

  function remover(indice: number) {
    aoMudar(notas.filter((_, i) => i !== indice))
  }

  function alterar(indice: number, campo: Partial<NotaFiscalFormulario>) {
    aoMudar(notas.map((nota, i) => (i === indice ? { ...nota, ...campo } : nota)))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-marca-500 font-mono text-xs font-semibold tracking-wider uppercase">
          Notas Fiscais
        </label>
        <button
          type="button"
          onClick={adicionar}
          disabled={desabilitado}
          className="text-marca-800 flex items-center gap-1 text-xs font-semibold hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
        >
          <Plus size={14} />
          Adicionar nota
        </button>
      </div>

      {notas.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-4 text-center text-xs text-slate-400">
          Nenhuma nota registrada. Compras em lojas diferentes geram uma nota cada.
        </p>
      )}

      {notas.map((nota, indice) => {
        const erroNota = errosPorNota?.[indice]
        return (
          <div
            key={indice}
            className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="grid min-w-0 flex-1 grid-cols-3 items-end gap-3">
              <div className="col-span-2">
                <CampoTexto
                  rotulo="Número *"
                  placeholder="Ex: 4471"
                  maxLength={60}
                  disabled={desabilitado}
                  value={nota.numero}
                  onChange={(evento) => alterar(indice, { numero: evento.target.value })}
                  mensagemErro={erroNota?.numero}
                />
              </div>
              {/* Sem asterisco: nota de consumidor costuma não ter série. */}
              <CampoTexto
                rotulo="Série"
                placeholder="Ex: 1"
                maxLength={20}
                disabled={desabilitado}
                value={nota.serie}
                onChange={(evento) => alterar(indice, { serie: evento.target.value })}
                mensagemErro={erroNota?.serie}
              />
            </div>
            {/* mt-6 alinha a lixeira com os inputs, não com os rótulos acima deles. */}
            <button
              type="button"
              aria-label={`Remover nota fiscal ${indice + 1}`}
              onClick={() => remover(indice)}
              disabled={desabilitado}
              className="mt-6 p-2.5 text-red-400 transition hover:text-red-600 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )
      })}

      {erro && <span className="text-xs font-medium text-red-500">{erro}</span>}
    </div>
  )
}
