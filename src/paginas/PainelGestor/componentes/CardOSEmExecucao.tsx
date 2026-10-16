import { BadgeOrigemOS } from '../../../componentes/BadgeOrigemOS'
import { fundoDoCardOS, fundoDoNumeroOS } from '../../../utilitarios/origemOS'
import { BadgeStatusExecucao } from '../../../componentes/BadgeStatusExecucao'
import { BadgeTipoOS } from '../../../componentes/BadgeTipoOS'
import { BadgeUrgencia } from '../../../componentes/BadgeUrgencia'
import { calcularHoras } from '../../../utilitarios/calcularHoras'
import { formatarHoras } from '../../../utilitarios/formatarHoras'
import { agoraParaBackend } from '../../../utilitarios/dataBackend'
import { obterNomeAlvo } from '../../../utilitarios/alvoOS'
import { formatarDataHora } from '../../../utilitarios/formatarData'
import type { OrdemServico } from '../../../tipos/ordemServico'

interface CardOSEmExecucaoProps {
  ordemServico: OrdemServico
}

export function CardOSEmExecucao({ ordemServico }: CardOSEmExecucaoProps) {
  // Enquanto a OS não é encerrada, o servidor não devolve horasTrabalhadas — o card
  // mostra o tempo corrido desde o início do atendimento apenas como referência visual.
  const horasDesdeInicio = ordemServico.dataInicio
    ? calcularHoras(ordemServico.dataInicio, agoraParaBackend())
    : 0

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl p-4 shadow-card ${fundoDoCardOS(ordemServico.origem)} ${
        ordemServico.statusExecucao === 'Pausada' ? 'border-l-4 border-amber-400' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold text-white ${fundoDoNumeroOS(ordemServico.origem)}`}>
          #{ordemServico.id}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">{obterNomeAlvo(ordemServico)}</span>
            {ordemServico.maquinaCodigo && (
              <span className="font-mono text-sm text-slate-400">
                · {ordemServico.maquinaCodigo}
              </span>
            )}
            <BadgeStatusExecucao status={ordemServico.statusExecucao} />
            <BadgeTipoOS tipo={ordemServico.tipo} />
            <BadgeOrigemOS origem={ordemServico.origem} />
            {ordemServico.urgencia && <BadgeUrgencia urgencia={ordemServico.urgencia} />}
          </div>
          <p className="mt-1 text-sm text-slate-500">{ordemServico.descricao}</p>
          <p className="mt-1 text-xs text-slate-400">
            Técnico:{' '}
            <span className="font-medium text-slate-500">
              {ordemServico.tecnicoNome
                ? `${ordemServico.tecnicoNome} — ${ordemServico.tecnicoArea ?? ''}`
                : '—'}
            </span>
          </p>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Aberta em {formatarDataHora(ordemServico.dataAbertura)}
            {ordemServico.dataInicio &&
              ` · Iniciada em ${formatarDataHora(ordemServico.dataInicio)}`}
            {' · '}
            {formatarHoras(horasDesdeInicio)} desde o início
          </p>
        </div>
      </div>

      {ordemServico.statusExecucao === 'Pausada' && ordemServico.pausaAtual && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {ordemServico.pausaAtual.pausadaEm && (
            <span className="block font-mono font-semibold">
              Pausada em {formatarDataHora(ordemServico.pausaAtual.pausadaEm)}
            </span>
          )}
          Motivo da pausa: {ordemServico.pausaAtual.motivo}
        </p>
      )}
    </div>
  )
}
