import { useState } from 'react'
import { ClipboardCheck, Eye, Printer } from 'lucide-react'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { BadgeTipoOS } from '../../componentes/BadgeTipoOS'
import { CampoBusca } from '../../componentes/CampoBusca'
import { FiltroTipoOS } from '../../componentes/FiltroTipoOS'
import { NavegacaoLojaSetorPaginada } from '../../componentes/NavegacaoLojaSetorPaginada'
import { useResumoOrdensServico } from '../../hooks/useResumoOrdensServico'
import type { ParametrosListagemOrdensServico } from '../../servicos/servicoOrdensServico'
import { obterNomeAlvo } from '../../utilitarios/alvoOS'
import { formatarDataHora } from '../../utilitarios/formatarData'
import { formatarMoeda } from '../../utilitarios/formatarMoeda'
import type { OrdemServico, TipoOS } from '../../tipos/ordemServico'
import { ModalDetalhesOS } from '../ModalDetalhesOS/ModalDetalhesOS'

interface SelecaoOS {
  ordem: OrdemServico
  imprimir: boolean
}

export function AdministradorOSFinalizadas() {
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoOS | ''>('')
  const [selecao, setSelecao] = useState<SelecaoOS | null>(null)

  // "Finalizada" = Técnico encerrou E o custo foi lançado. O servidor resolve essa regra
  // e também pagina (12 por página): é histórico, só cresce. Navegada Loja → Setor
  // (NavegacaoLojaSetorPaginada): os cards saem do resumo e só o setor aberto busca a página.
  // Loja e setor são a própria navegação, então saíram dos filtros.
  const filtros: ParametrosListagemOrdensServico = {
    finalizada: true,
    busca: busca.trim() || undefined,
    tipo: filtroTipo || undefined,
  }
  // Mesma chave do resumo que a navegação usa: o total sai do cache, sem outra requisição.
  const { data: resumo, isLoading } = useResumoOrdensServico(filtros)
  const total = resumo?.reduce((soma, linha) => soma + linha.quantidade, 0) ?? 0

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto="Painel do Administrador"
        titulo="OS Finalizadas"
        Icone={ClipboardCheck}
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8 lg:max-w-6xl 2xl:max-w-[88rem]">
        <p className="text-sm text-slate-500">
          Ordens de serviço concluídas e com todos os dados preenchidos, incluindo o custo de
          manutenção já lançado.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CampoBusca
            valor={busca}
            aoMudar={setBusca}
            placeholder="Buscar por máquina ou código..."
          />

          <div className="sm:w-56 sm:shrink-0">
            <FiltroTipoOS valor={filtroTipo} aoMudar={setFiltroTipo} />
          </div>
        </div>

        {!isLoading && resumo && (
          <p className="text-sm text-slate-500">{total} OS finalizada(s)</p>
        )}

        <NavegacaoLojaSetorPaginada
          filtros={filtros}
          IconeVazio={ClipboardCheck}
          mensagemVazio="Nenhuma OS finalizada encontrada para esses filtros."
          rotuloNavegacao="Navegação das OS finalizadas"
          emGrade
          renderItem={(ordem) => {
            const custoTotal =
              (ordem.custo?.custoHoraTecnico ?? 0) + (ordem.custo?.custoManutencao ?? 0)

            return (
              <div className="flex h-full flex-col gap-3 rounded-2xl bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  {/* Uma linha só: sem flex-wrap o badge nunca cai para a linha de baixo. */}
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-marca-600 font-mono text-sm font-bold text-white">
                      #{ordem.id}
                    </span>
                    <span className="truncate font-semibold text-slate-800">
                      {obterNomeAlvo(ordem)}
                    </span>
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
                  <p className="mt-1 font-mono text-xs font-semibold text-emerald-700">
                    Custo Total: {formatarMoeda(custoTotal)}
                  </p>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelecao({ ordem, imprimir: false })}
                    aria-label="Visualizar OS"
                    className="flex items-center justify-center rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-600 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-marca-500"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelecao({ ordem, imprimir: true })}
                    aria-label="Imprimir OS"
                    className="flex items-center justify-center rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-600 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-marca-500"
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            )
          }}
        />
      </main>

      {selecao && (
        <ModalDetalhesOS
          ordemServico={selecao.ordem}
          autoImprimir={selecao.imprimir}
          aoFechar={() => setSelecao(null)}
        />
      )}
    </div>
  )
}
