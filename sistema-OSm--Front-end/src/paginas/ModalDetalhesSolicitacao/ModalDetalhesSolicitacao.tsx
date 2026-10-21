import { createPortal } from 'react-dom'
import { XCircle } from 'lucide-react'
import { Botao } from '../../componentes/Botao'
import { BadgeOrigemPreventiva } from '../../componentes/BadgeOrigemPreventiva'
import { BadgeStatus } from '../../componentes/BadgeStatus'
import { BadgeTipoOS } from '../../componentes/BadgeTipoOS'
import { ImagemProgressiva } from '../../componentes/ImagemProgressiva'
import { obterNomeAlvo, obterCodigoAlvo } from '../../utilitarios/alvoOS'
import { formatarDataHora } from '../../utilitarios/formatarData'
import type { SolicitacaoOS } from '../../tipos/ordemServico'
import { useSaidaAnimada } from '../../hooks/useSaidaAnimada'
import { useDialogo } from '../../hooks/useDialogo'

interface ModalDetalhesSolicitacaoProps {
  solicitacao: SolicitacaoOS
  contexto: string
  aoFechar: () => void
}

export function ModalDetalhesSolicitacao({
  solicitacao,
  contexto,
  aoFechar,
}: ModalDetalhesSolicitacaoProps) {
  const { fechar, classeFundo, classeCartao } = useSaidaAnimada(aoFechar)

  const ehPreventiva = solicitacao.origem === 'preventiva'
  // Anexos vêm do servidor: a foto do defeito é obrigatória, o vídeo é opcional.
  const fotoDefeito = solicitacao.anexos.find((anexo) => anexo.tipo === 'foto')
  const videoDefeito = solicitacao.anexos.find(
    (anexo) => anexo.tipo === 'video',
  )

  const { propsDialogo, idTitulo } = useDialogo(fechar)

  return createPortal(
    <div
      className={`${classeFundo} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`}
    >
      <div
        {...propsDialogo}
        className={`${classeCartao} shadow-pop w-full max-w-md overflow-hidden rounded-2xl bg-white`}
      >
        <div className="bg-marca-600 flex items-start justify-between px-6 py-4">
          <div>
            <p className="font-mono text-xs font-bold tracking-widest text-white/80 uppercase">
              {contexto}
            </p>
            <p id={idTitulo} className="font-display text-lg font-bold text-white">
              Solicitação #{solicitacao.id}
            </p>
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

        <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">
                {obterNomeAlvo(solicitacao)}
              </p>
              <p className="font-mono text-sm text-slate-400">
                {obterCodigoAlvo(solicitacao)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex gap-1.5">
                <BadgeStatus status={solicitacao.status} />
                <BadgeTipoOS tipo={solicitacao.tipo} />
              </div>
              {ehPreventiva && <BadgeOrigemPreventiva />}
            </div>
          </div>

          {solicitacao.maquinaFotoUrl && (
            <div>
              <p className="mb-1 font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Foto da Máquina (cadastro)
              </p>
              <ImagemProgressiva
                src={solicitacao.maquinaFotoUrl}
                alt={obterNomeAlvo(solicitacao)}
                className="h-40 w-full rounded-lg bg-slate-50 object-contain"
              />
            </div>
          )}

          {fotoDefeito && (
            <div>
              <p className="mb-1 font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {solicitacao.tipo === 'reparo'
                  ? 'Foto do Item'
                  : 'Foto do Defeito'}
              </p>
              <ImagemProgressiva
                src={fotoDefeito.url}
                alt={
                  solicitacao.tipo === 'reparo'
                    ? 'Foto do item'
                    : 'Foto do defeito'
                }
                className="h-40 w-full rounded-lg bg-slate-50 object-contain"
              />
            </div>
          )}

          {videoDefeito && (
            <div>
              <p className="mb-1 font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Vídeo do Defeito
              </p>
              <video
                src={videoDefeito.url}
                controls
                className="h-40 w-full rounded-lg bg-black object-contain"
              />
            </div>
          )}

          {solicitacao.origem === 'direta' && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              OS aberta diretamente por {solicitacao.solicitanteNome}, sem
              passar pela fila e sem foto.
            </p>
          )}

          {ehPreventiva && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Solicitação aberta automaticamente pelo sistema ao vencer a
              manutenção preventiva desta máquina.
            </p>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Loja
            </span>
            <span className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Setor
            </span>
            <p className="text-slate-700">{solicitacao.lojaNome}</p>
            <p className="text-slate-700">{solicitacao.setorNome}</p>

            <span className="mt-2 font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Solicitante
            </span>
            <span className="mt-2 font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Data/Hora
            </span>
            <p className="text-slate-700">
              {solicitacao.solicitanteNome ?? 'Sistema (Preventiva)'}
            </p>
            <p className="font-mono text-slate-700">
              {formatarDataHora(solicitacao.criadoEm)}
            </p>

            {/* O Tipo de OS (Predial/Corretiva) não aparece aqui: a solicitação nasce sem
                classificação — quem classifica é quem executa, no encerramento. */}
          </div>

          <div>
            <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Descrição
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {solicitacao.descricao}
            </p>
          </div>

          <div>
            <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Impacto na Produção
            </p>
            {solicitacao.impactos.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">
                Máquina seguiu operando — não acumula tempo de parada.
              </p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                {solicitacao.impactos.map((marcador) => (
                  <span
                    key={marcador}
                    className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700"
                  >
                    {marcador}
                  </span>
                ))}
              </div>
            )}
          </div>

          {solicitacao.status === 'Rejeitada' && solicitacao.motivoRejeicao && (
            <div className="rounded-lg bg-red-50 px-3 py-2.5">
              <p className="font-mono text-xs font-semibold tracking-wide text-red-700 uppercase">
                Motivo da Rejeição
              </p>
              <p className="mt-1 text-sm text-red-700">
                {solicitacao.motivoRejeicao}
              </p>
              {solicitacao.rejeitadoPorNome && (
                <p className="mt-1 text-xs text-red-600/80">
                  Rejeitada por {solicitacao.rejeitadoPorNome}
                </p>
              )}
            </div>
          )}

          <Botao type="button" variante="secundario" onClick={fechar}>
            Fechar
          </Botao>
        </div>
      </div>
    </div>,
    document.body,
  )
}
