import { useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarCheck, Hammer, Inbox, Wrench, XCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import { Botao } from '../../../componentes/Botao'
import { Esqueleto } from '../../../componentes/Esqueleto'
import { Paginacao } from '../../../componentes/Paginacao'
import { BadgeOrigemOS } from '../../../componentes/BadgeOrigemOS'
import { useOrdensDoPainelDaLoja } from '../../../hooks/useOrdensDoPainelDaLoja'
import { useSaidaAnimada } from '../../../hooks/useSaidaAnimada'
import { servicoOrdensServico } from '../../../servicos/servicoOrdensServico'
import { formatarDataHora } from '../../../utilitarios/formatarData'
import { formatarMoeda } from '../../../utilitarios/formatarMoeda'
import type { GrupoOrdensDoPainel } from '../../../tipos/indicadorMaquina'
import type { OrdemServico } from '../../../tipos/ordemServico'
import { fundoDoNumeroOS } from '../../../utilitarios/origemOS'
import { ModalDetalhesOS } from '../../ModalDetalhesOS/ModalDetalhesOS'

// Cada card tem o seu texto: o maquinário, as preventivas e os pequenos reparos (os dois últimos à
// parte) explicam de onde vem o número de um jeito diferente.
const TEXTOS: Record<GrupoOrdensDoPainel, { titulo: string; vazio: string; unidade: [string, string] }> = {
  maquinario: {
    titulo: 'OS de Maquinário',
    vazio: 'Nenhuma OS de máquina encerrada neste recorte.',
    unidade: ['OS', 'OS'],
  },
  preventivas: {
    titulo: 'Manutenções Preventivas',
    vazio: 'Nenhuma manutenção preventiva encerrada neste recorte.',
    unidade: ['preventiva', 'preventivas'],
  },
  reparos: {
    titulo: 'Pequenos Reparos',
    vazio: 'Nenhum pequeno reparo encerrado neste recorte.',
    unidade: ['reparo', 'reparos'],
  },
}

interface ModalOrdensDaLojaProps {
  lojaId: number
  // Qual card: o maquinário, as preventivas ou os pequenos reparos.
  grupo: GrupoOrdensDoPainel
  // Os recortes que o painel está mostrando, para a lista bater com o número do card.
  setorId?: number
  maquinaId?: number
  mes?: string
  // "Total da loja", "Setor Padaria"... — diz de que recorte são os reparos.
  escopoRotulo: string
  aoFechar: () => void
}

// A lista por trás de um card de custo do painel da loja (maquinário, preventivas ou pequenos reparos): cada OS
// encerrada que compõe o número, mais nova primeiro, 12 por página. Clicar num item abre o detalhe da OS (o
// mesmo das OS finalizadas, com o histórico) POR CIMA da lista, e fechar volta a ela.
export function ModalOrdensDaLoja({
  lojaId,
  grupo,
  setorId,
  maquinaId,
  mes,
  escopoRotulo,
  aoFechar,
}: ModalOrdensDaLojaProps) {
  const { fechar, classeFundo, classeCartao } = useSaidaAnimada(aoFechar)
  const [pagina, setPagina] = useState(1)
  const [ordemAberta, setOrdemAberta] = useState<OrdemServico | null>(null)

  const textos = TEXTOS[grupo]
  const { data, isLoading } = useOrdensDoPainelDaLoja(lojaId, { grupo, setorId, maquinaId, mes, pagina }, true)
  const ordens = data?.dados ?? []
  const totalPaginas = Math.max(1, data?.totalPaginas ?? 1)

  async function abrirDetalhe(id: number) {
    try {
      setOrdemAberta(await servicoOrdensServico.obterPorId(id))
    } catch {
      // Fora do escopo ou apagada: o api.ts já mostra o toast do 404.
      toast.info(`Não foi possível abrir a OS #${id}.`)
    }
  }

  return (
    <>
      {createPortal(
        <div className={`${classeFundo} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`}>
          <div className={`${classeCartao} shadow-pop flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white`}>
            <div className="flex items-start justify-between bg-marca-600 px-6 py-4">
              <div>
                <p className="font-mono text-xs font-bold tracking-widest text-white/80 uppercase">
                  {escopoRotulo}{mes ? ` · ${mes}` : ''}
                </p>
                <p className="font-display text-lg font-bold text-white">{textos.titulo}</p>
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

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
              {isLoading && (
                <>
                  <Esqueleto className="h-16 w-full" />
                  <Esqueleto className="h-16 w-full" />
                  <Esqueleto className="h-16 w-full" />
                </>
              )}

              {!isLoading && ordens.length === 0 && (
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-200/60 bg-slate-50 px-4 py-8 text-center text-slate-400">
                  <Inbox size={20} />
                  <p className="max-w-sm text-xs">{textos.vazio}</p>
                </div>
              )}

              {ordens.map((ordem) => (
                <button
                  key={ordem.id}
                  type="button"
                  onClick={() => void abrirDetalhe(ordem.id)}
                  className="group hover:border-marca-500/40 flex min-w-0 items-start gap-3 rounded-xl border border-slate-200/60 bg-white p-3 text-left transition-colors hover:bg-slate-50"
                >
                  {/* Âmbar na preventiva, como nos cards de OS; laranja no reparo (a cor do card dele). */}
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${
                      grupo === 'reparos' ? 'bg-orange-500' : fundoDoNumeroOS(ordem.origem)
                    }`}
                  >
                    {grupo === 'reparos' ? (
                      <Hammer size={16} />
                    ) : grupo === 'preventivas' ? (
                      <CalendarCheck size={16} />
                    ) : (
                      <Wrench size={16} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-slate-800">
                      <span className="truncate">{ordem.item || ordem.descricao}</span>
                      {ordem.codigo && (
                        <span className="font-mono text-xs font-normal text-slate-400">· {ordem.codigo}</span>
                      )}
                      <span className="font-mono text-xs font-normal text-slate-400">#{ordem.id}</span>
                      <BadgeOrigemOS origem={ordem.origem} />
                    </p>
                    <p className="truncate text-xs text-slate-500">{ordem.descricao}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                      {ordem.setorNome} · {ordem.tecnicoNome} ·{' '}
                      {ordem.encerradaEm ? formatarDataHora(ordem.encerradaEm) : '—'}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-bold text-slate-800">
                    {formatarMoeda(ordem.custoTotal)}
                  </span>
                </button>
              ))}

              {totalPaginas > 1 && (
                <Paginacao pagina={pagina} totalPaginas={totalPaginas} aoMudarPagina={setPagina} />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200/60 px-4 py-3">
              <p className="font-mono text-xs text-slate-400">
                {data ? `${data.total} ${data.total === 1 ? textos.unidade[0] : textos.unidade[1]}` : ''}
              </p>
              <div className="w-32">
                <Botao type="button" variante="secundario" onClick={fechar}>
                  Fechar
                </Botao>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {ordemAberta && (
        <ModalDetalhesOS
          ordemServico={ordemAberta}
          aoFechar={() => setOrdemAberta(null)}
          contexto="Painel do Gestor"
        />
      )}
    </>
  )
}
