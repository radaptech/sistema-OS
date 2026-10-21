import { Ban, Eye, Wrench } from 'lucide-react'
import { BadgeOrigemPreventiva } from '../../../componentes/BadgeOrigemPreventiva'
import { BadgeStatus } from '../../../componentes/BadgeStatus'
import { BadgeTipoOS } from '../../../componentes/BadgeTipoOS'
import { Botao } from '../../../componentes/Botao'
import { obterNomeAlvo } from '../../../utilitarios/alvoOS'
import { formatarDataHora } from '../../../utilitarios/formatarData'
import type { SolicitacaoOS } from '../../../tipos/ordemServico'

interface CardSolicitacaoGestorProps {
  solicitacao: SolicitacaoOS
  aoAbrirOS?: (solicitacao: SolicitacaoOS) => void
  aoRejeitar?: (solicitacao: SolicitacaoOS) => void
  aoVisualizar?: (solicitacao: SolicitacaoOS) => void
}

export function CardSolicitacaoGestor({
  solicitacao,
  aoAbrirOS,
  aoRejeitar,
  aoVisualizar,
}: CardSolicitacaoGestorProps) {
  const ehPreventiva = solicitacao.origem === 'preventiva'

  return (
    <div
      className={`shadow-card flex flex-col gap-3 rounded-2xl bg-white p-4 ${
        ehPreventiva ? 'bg-amber-50/70 ring-1 ring-amber-400/40 ring-inset' : ''
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex flex-1 items-start gap-4">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold text-white ${
              ehPreventiva
                ? 'bg-amber-500'
                : 'bg-marca-600'
            }`}
          >
            #{solicitacao.id}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800">
                {obterNomeAlvo(solicitacao)}
              </span>
              {solicitacao.maquinaCodigo && (
                <span className="font-mono text-sm text-slate-400">
                  · {solicitacao.maquinaCodigo}
                </span>
              )}
              <BadgeStatus status={solicitacao.status} />
              <BadgeTipoOS tipo={solicitacao.tipo} />
              {ehPreventiva && <BadgeOrigemPreventiva />}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {solicitacao.descricao}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-400">
              {formatarDataHora(solicitacao.criadoEm)} · Por{' '}
              <span className="font-medium text-slate-500">
                {solicitacao.solicitanteNome}
              </span>
            </p>
          </div>
        </div>

        {(aoVisualizar || aoRejeitar || aoAbrirOS) && (
          <div className="flex gap-2 sm:shrink-0">
            {aoVisualizar && (
              <button
                type="button"
                onClick={() => aoVisualizar(solicitacao)}
                aria-label="Visualizar solicitação"
                className="shadow-card flex items-center justify-center rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-600 transition-all duration-200 hover:bg-slate-200"
              >
                <Eye size={16} />
              </button>
            )}

            {aoRejeitar && (
              <button
                type="button"
                onClick={() => aoRejeitar(solicitacao)}
                aria-label="Rejeitar solicitação"
                title="Rejeitar solicitação"
                className="shadow-card flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap text-red-700 transition-all duration-200 hover:bg-red-100 active:scale-95"
              >
                <Ban size={16} />
                Rejeitar
              </button>
            )}

            {aoAbrirOS && (
              <div className="flex-1">
                <Botao
                  type="button"
                  onClick={() => aoAbrirOS(solicitacao)}
                  className="flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Wrench size={14} />
                  Abrir OS
                </Botao>
              </div>
            )}
          </div>
        )}
      </div>

      {solicitacao.status === 'Rejeitada' && solicitacao.motivoRejeicao && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <span className="font-semibold">Motivo da rejeição:</span>{' '}
          {solicitacao.motivoRejeicao}
          {solicitacao.rejeitadoPorNome && (
            <span className="text-red-600/80">
              {' '}
              · por {solicitacao.rejeitadoPorNome}
            </span>
          )}
        </p>
      )}
    </div>
  )
}
