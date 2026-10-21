import { CircleDollarSign } from 'lucide-react'
import { BadgeTipoOS } from '../../../componentes/BadgeTipoOS'
import { obterNomeAlvo } from '../../../utilitarios/alvoOS'
import { formatarDataHora } from '../../../utilitarios/formatarData'
import { formatarMoeda } from '../../../utilitarios/formatarMoeda'
import { rotulosCustoOS } from '../../../utilitarios/rotulosCustoOS'
import type { OrdemServico } from '../../../tipos/ordemServico'

interface CardCustoOSProps {
  ordem: OrdemServico
  aoEditarCustos: (ordem: OrdemServico) => void
}

// Loja e setor não aparecem no card: a tela já está dentro deles (trilha Lojas › Loja › Setor).
export function CardCustoOS({ ordem, aoEditarCustos }: CardCustoOSProps) {
  return (
    <div className="shadow-card hover:shadow-card-hover flex h-full flex-col gap-3 rounded-2xl bg-white p-4 transition-shadow duration-200 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        {/* Uma linha só: sem flex-wrap o badge nunca cai para a linha de baixo,
              então todo card tem a mesma altura de cabeçalho e a coluna alinha. */}
        <div className="flex items-center gap-2">
          <span className="bg-marca-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold text-white">
            #{ordem.id}
          </span>
          <span className="truncate font-semibold text-slate-800">{obterNomeAlvo(ordem)}</span>
          {ordem.maquinaCodigo && (
            <span className="shrink-0 font-mono text-sm text-slate-400">
              · {ordem.maquinaCodigo}
            </span>
          )}
          <BadgeTipoOS tipo={ordem.tipo} />
        </div>
        <p className="mt-1 truncate text-xs text-slate-400">
          Encerrada em {ordem.dataFim ? formatarDataHora(ordem.dataFim) : '—'}
        </p>

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <p className="text-slate-400">
            {rotulosCustoOS.custoMaoDeObra}{' '}
            <span className="font-mono font-semibold text-slate-600">
              {ordem.custo?.custoHoraTecnico != null
                ? formatarMoeda(ordem.custo.custoHoraTecnico)
                : '—'}
            </span>
          </p>
          <p className="text-slate-400">
            {rotulosCustoOS.custoMaterial}{' '}
            <span className="font-mono font-semibold text-slate-600">
              {ordem.custo?.custoManutencao !== undefined
                ? formatarMoeda(ordem.custo.custoManutencao)
                : '—'}
            </span>
          </p>
        </div>
        {/* A linha só existe quando o Técnico declarou nota no encerramento —
              OS de mão de obra pura não tem o que informar. Com a declaração, o
              âmbar deixa de ser alarme falso e vira pendência de verdade: alguém
              disse que há um documento e ele ainda não foi registrado. */}
        {ordem.custo?.temNotaFiscal && (
          <p className="mt-1 text-xs text-slate-400">
            {ordem.custo.notasFiscais.length > 1 ? 'Notas Fiscais' : 'Nota Fiscal'}{' '}
            {ordem.custo.notasFiscais.length > 0 ? (
              <span className="font-mono font-semibold text-slate-600">
                {ordem.custo.notasFiscais
                  .map((nota) => (nota.serie ? `${nota.numero} / série ${nota.serie}` : nota.numero))
                  .join(' · ')}
              </span>
            ) : (
              <span className="font-semibold text-amber-600">ainda não informada</span>
            )}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => aoEditarCustos(ordem)}
        className="bg-marca-600 font-display shadow-card hover:shadow-card-hover focus:ring-marca-500 hover:bg-marca-800 flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition-all duration-200 focus:ring-2 focus:outline-none active:scale-[0.98]"
      >
        <CircleDollarSign size={14} />
        Editar Custos
      </button>
    </div>
  )
}
