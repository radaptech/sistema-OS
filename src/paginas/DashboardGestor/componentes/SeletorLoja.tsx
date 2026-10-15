import {
  ChevronRight,
  Layers,
  Store,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { ImagemProgressiva } from '../../../componentes/ImagemProgressiva'
import type { Loja } from '../../../tipos/loja'

export interface ResumoLoja {
  loja: Loja
  quantidadeMaquinas: number
  quantidadeSetores: number
  quantidadeCriticas: number
  // Escopo 'todos' do Gestor: ele responde pela loja inteira, não só por alguns setores.
  acessoTotal: boolean
}

interface SeletorLojaProps {
  lojas: ResumoLoja[]
  aoSelecionar: (lojaId: number) => void
}

export function SeletorLoja({ lojas, aoSelecionar }: SeletorLojaProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {lojas.map((resumo, indice) => (
        <button
          key={resumo.loja.id}
          type="button"
          onClick={() => aoSelecionar(resumo.loja.id)}
          style={{ animationDelay: `${indice * 40}ms` }}
          className="group shadow-card hover:shadow-card-hover animate-surgir flex min-w-0 flex-col gap-4 rounded-2xl bg-white p-4 text-left transition-shadow sm:p-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            {resumo.loja.fotoUrl ? (
              <ImagemProgressiva
                src={resumo.loja.fotoUrl}
                alt={resumo.loja.nome}
                className="h-11 w-11 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="bg-marca-100 text-marca-600 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                <Store size={20} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-display truncate text-base font-bold text-slate-900">
                {resumo.loja.nome}
              </h2>
              <p className="font-mono text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                {resumo.acessoTotal
                  ? 'Todos os setores'
                  : `${resumo.quantidadeSetores} ${resumo.quantidadeSetores === 1 ? 'setor' : 'setores'} no seu escopo`}
              </p>
            </div>
            <ChevronRight
              size={18}
              className="group-hover:text-marca-600 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200/60 bg-slate-50/50 p-2.5">
            <Contador
              Icone={Wrench}
              valor={resumo.quantidadeMaquinas}
              rotulo="Máquinas"
            />
            <Contador
              Icone={Layers}
              valor={resumo.quantidadeSetores}
              rotulo="Setores"
            />
            <Contador
              Icone={TriangleAlert}
              valor={resumo.quantidadeCriticas}
              rotulo="Críticas"
              destaque={resumo.quantidadeCriticas > 0}
            />
          </div>
        </button>
      ))}
    </div>
  )
}

interface ContadorProps {
  Icone: typeof Wrench
  valor: number
  rotulo: string
  destaque?: boolean
}

function Contador({ Icone, valor, rotulo, destaque = false }: ContadorProps) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5">
      <span
        className={`flex items-center gap-1 font-mono text-base font-bold ${destaque ? 'text-red-600' : 'text-slate-800'}`}
      >
        <Icone
          size={13}
          className={destaque ? 'text-red-500' : 'text-slate-400'}
        />
        {valor}
      </span>
      <span className="truncate text-[10px] font-semibold text-slate-500 uppercase">
        {rotulo}
      </span>
    </div>
  )
}
