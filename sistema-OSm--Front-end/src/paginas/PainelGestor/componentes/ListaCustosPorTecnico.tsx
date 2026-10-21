import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatarHoras } from '../../../utilitarios/formatarHoras'
import { formatarMoeda } from '../../../utilitarios/formatarMoeda'
import type { CustoTecnicoDoMes } from '../../../tipos/custosDoMes'

interface ListaCustosPorTecnicoProps {
  tecnicos: CustoTecnicoDoMes[]
}

// A mão de obra de cada técnico no mês, do mais caro para o mais barato (o servidor já manda
// ordenado). Começa fechada: o card fica no topo do painel e não pode empurrar as abas para
// fora da tela do celular só para mostrar uma lista que o Gestor consulta de vez em quando.
export function ListaCustosPorTecnico({
  tecnicos,
}: ListaCustosPorTecnicoProps) {
  const [aberta, setAberta] = useState(false)

  if (tecnicos.length === 0) {
    return null
  }

  return (
    <div className="border-t border-slate-200/60 pt-3">
      <button
        type="button"
        aria-expanded={aberta}
        onClick={() => setAberta((valor) => !valor)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="font-mono text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
          Por técnico ({tecnicos.length})
        </span>
        <ChevronDown
          size={16}
          className={`duration-rapido text-slate-400 transition-transform ${aberta ? 'rotate-180' : ''}`}
        />
      </button>

      {aberta && (
        <ul className="animate-surgir mt-2 flex flex-col">
          {tecnicos.map((tecnico) => (
            <li
              key={tecnico.tecnicoId}
              className="flex items-center justify-between gap-3 border-b border-slate-200/60 py-2 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {tecnico.tecnicoNome}
                </p>
                <p className="text-xs text-slate-500">
                  {tecnico.quantidadeOs === 1
                    ? '1 OS'
                    : `${tecnico.quantidadeOs} OS`}{' '}
                  · {formatarHoras(tecnico.horasTrabalhadas)} trabalhadas
                </p>
              </div>
              <p className="shrink-0 font-mono text-sm font-bold text-slate-800">
                {formatarMoeda(tecnico.maoDeObra)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
