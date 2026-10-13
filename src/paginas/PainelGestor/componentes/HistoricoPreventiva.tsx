import { CalendarClock, Check, Clock, History, X } from 'lucide-react'
import { EsqueletoLista, EsqueletoCardOS } from '../../../componentes/Esqueleto'
import { useHistoricoPreventiva } from '../../../hooks/useHistoricoPreventiva'
import { atrasoEntrada } from '../../../utilitarios/atrasoEntrada'
import { formatarData, formatarDataHora } from '../../../utilitarios/formatarData'
import type { CicloPreventiva, PreventivaListada } from '../../../tipos/maquina'

interface HistoricoPreventivaProps {
  preventiva: PreventivaListada
}

// Último nível da aba "Manutenção Prev.": a preventiva e a linha do tempo dos ciclos que
// ela já gerou. Cada ciclo é uma OS aberta pelo servidor quando a preventiva venceu —
// feita (Concluída) ganha o "v" verde; qualquer outro status é ciclo não realizado e
// fica em vermelho, com o status atual da OS para o Gestor saber onde ela parou.
export function HistoricoPreventiva({ preventiva }: HistoricoPreventivaProps) {
  const { data: ciclos = [], isLoading } = useHistoricoPreventiva(preventiva.id)
  const feitos = ciclos.filter((ciclo) => ciclo.status === 'Concluída').length

  return (
    <div className="flex flex-col gap-4">
      <div className="shadow-card flex items-start gap-3 rounded-2xl bg-white p-4">
        <span className="bg-marca-600 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white">
          <CalendarClock size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800">{preventiva.descricao}</p>
          <p className="mt-1 font-mono text-xs text-slate-400">
            {preventiva.maquinaNome} · A cada {preventiva.intervaloDias} dia(s)
            {preventiva.tecnicoNome && ` · ${preventiva.tecnicoNome}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold whitespace-nowrap ${
            preventiva.ativa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
          }`}
        >
          {preventiva.ativa ? 'Ativa' : 'Inativa'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
        <div className="flex items-center gap-2">
          <History size={16} className="text-marca-600" />
          <h2 className="font-display text-sm font-bold tracking-widest text-slate-800 uppercase">
            Histórico
          </h2>
        </div>
        {ciclos.length > 0 && (
          <span className="font-mono text-xs text-slate-500">
            {feitos} de {ciclos.length} {ciclos.length === 1 ? 'feito' : 'feitos'}
          </span>
        )}
      </div>

      {isLoading ? (
        <EsqueletoLista quantidade={3}>
          <EsqueletoCardOS />
        </EsqueletoLista>
      ) : (
        <ol className="flex flex-col gap-2">
          {/* A próxima data abre a linha do tempo, neutra: ainda não venceu, não é nem
              feita nem perdida. Inativa não tem próximo ciclo. */}
          {preventiva.ativa && (
            <li className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200/60 bg-slate-50 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <Clock size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-600">
                  Próxima: {formatarData(preventiva.proximaData)}
                </p>
                <p className="text-xs text-slate-400">A OS abre sozinha nessa data.</p>
              </div>
            </li>
          )}

          {ciclos.map((ciclo, indice) => (
            <li key={ciclo.id} style={atrasoEntrada(indice)} className="animate-surgir">
              <LinhaCiclo ciclo={ciclo} />
            </li>
          ))}

          {ciclos.length === 0 && (
            <li className="py-6 text-center text-xs text-slate-400">
              Esta preventiva ainda não venceu nenhuma vez.
            </li>
          )}
        </ol>
      )}
    </div>
  )
}

function LinhaCiclo({ ciclo }: { ciclo: CicloPreventiva }) {
  const feito = ciclo.status === 'Concluída'

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        feito ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
      }`}
    >
      <span
        aria-label={feito ? 'Feita' : 'Não feita'}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
          feito ? 'bg-emerald-500' : 'bg-red-500'
        }`}
      >
        {feito ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${feito ? 'text-emerald-800' : 'text-red-700'}`}>
          Venceu em {formatarData(ciclo.dataAbertura)}
        </p>
        <p className={`truncate text-xs ${feito ? 'text-emerald-700' : 'text-red-600'}`}>
          {feito
            ? `Feita em ${ciclo.dataFim ? formatarDataHora(ciclo.dataFim) : '—'} · ${ciclo.tecnicoNome}`
            : `Não feita · ${ciclo.status} · ${ciclo.tecnicoNome}`}
        </p>
      </div>
      <span className="shrink-0 font-mono text-xs text-slate-400">OS #{ciclo.id}</span>
    </div>
  )
}
