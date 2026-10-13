import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleDollarSign } from 'lucide-react'
import { toast } from 'react-toastify'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { BadgeTipoOS } from '../../componentes/BadgeTipoOS'
import { CampoBusca } from '../../componentes/CampoBusca'
import { CampoSelecao } from '../../componentes/CampoSelecao'
import { FiltroTipoOS } from '../../componentes/FiltroTipoOS'
import { EsqueletoLista, EsqueletoCardOS } from '../../componentes/Esqueleto'
import { useLojas } from '../../hooks/useLojas'
import { useOrdensServicoTodas } from '../../hooks/useOrdensServicoTodas'
import { servicoOrdensServico } from '../../servicos/servicoOrdensServico'
import { obterNomeAlvo } from '../../utilitarios/alvoOS'
import { atrasoEntrada } from '../../utilitarios/atrasoEntrada'
import { formatarDataHora } from '../../utilitarios/formatarData'
import { formatarMoeda } from '../../utilitarios/formatarMoeda'
import { rotulosCustoOS } from '../../utilitarios/rotulosCustoOS'
import type { OrdemServico, TipoOS } from '../../tipos/ordemServico'
import { ModalLancarCustoManutencao } from './componentes/ModalLancarCustoManutencao'
import type { DadosLancarCustoManutencao } from './esquemaLancarCustoManutencao'
import { FiltroRevisaoCusto } from './componentes/FiltroRevisaoCusto'
import type { AbaRevisaoCusto } from './componentes/FiltroRevisaoCusto'

export function AdministradorCustosPendentes() {
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [filtroLoja, setFiltroLoja] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoOS | ''>('')
  const [ordemParaLancarCusto, setOrdemParaLancarCusto] =
    useState<OrdemServico | null>(null)
  const [aba, setAba] = useState<AbaRevisaoCusto>('pendentes')

  // Toda OS Concluída, com ou sem custo lançado: o Técnico já grava os dois custos no
  // encerramento e o Administrador só corrige se quiser — inclusive nas OS que foram
  // executadas por empresa externa, que também passam pelo Técnico.
  const { data: ordensServico = [], isLoading } = useOrdensServicoTodas({
    status: ['Concluída'],
    busca: busca.trim() || undefined,
    lojaId: filtroLoja ? Number(filtroLoja) : undefined,
    tipo: filtroTipo || undefined,
  })
  const { data: lojas = [] } = useLojas()

  const { mutateAsync: lancarCusto } = useMutation({
    mutationFn: servicoOrdensServico.lancarCustoManutencao,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-todas'] }),
  })

  // Lista TODA OS Concluída (não só as com custoManutencao ainda vazio): o Técnico já
  // grava os dois custos no encerramento (item 11 do CLAUDE.md), então eles chegam aqui
  // pré-preenchidos e o Administrador só edita se precisar conferir contra a nota. A
  // aba sai de custo.revisadoEm, gravado pelo servidor no POST /custo: "Pendentes" é o
  // que ninguém conferiu ainda, "Revisadas" é o histórico do que já foi conferido —
  // por qualquer Administrador, em qualquer aparelho.
  const ordensPendentes = ordensServico.filter((os) => os.custo?.revisadoEm == null)
  const ordensRevisadas = ordensServico.filter((os) => os.custo?.revisadoEm != null)
  const ordensConcluidas = aba === 'pendentes' ? ordensPendentes : ordensRevisadas

  async function aoSalvarCusto(dados: DadosLancarCustoManutencao) {
    if (!ordemParaLancarCusto) {
      return
    }

    await lancarCusto({ ordemServicoId: ordemParaLancarCusto.id, ...dados })
    // Sem marcar nada aqui: o POST /custo grava custo.revisadoEm no servidor e o
    // onSuccess da mutation invalida a lista — a OS reaparece já em "Revisadas".
    toast.success(`Custos atualizados para a OS #${ordemParaLancarCusto.id}.`)
    setOrdemParaLancarCusto(null)
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto="Painel do Administrador"
        titulo="Custos Pendentes"
        Icone={CircleDollarSign}
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8 lg:max-w-6xl 2xl:max-w-[88rem]">
        <p className="text-sm text-slate-500">
          Toda OS chega com Valor Peças e Valor Mão de Obra preenchidos pelo
          próprio Técnico no encerramento — edite aqui só se precisar corrigir
          algo. Confira os valores contra a nota fiscal que o embasa (a fatura
          da empresa terceirizada, a nota da peça ou do material) e registre o
          número dela aqui.
        </p>

        <FiltroRevisaoCusto
          valor={aba}
          aoMudar={setAba}
          contagens={{
            pendentes: ordensPendentes.length,
            revisadas: ordensRevisadas.length,
          }}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CampoBusca
            valor={busca}
            aoMudar={setBusca}
            placeholder="Buscar por máquina ou código..."
          />

          <div className="sm:w-56 sm:shrink-0">
            <CampoSelecao
              rotulo="Loja"
              value={filtroLoja}
              onChange={(evento) => setFiltroLoja(evento.target.value)}
            >
              <option value="">Todas as lojas</option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome}
                </option>
              ))}
            </CampoSelecao>
          </div>

          <div className="sm:w-56 sm:shrink-0">
            <FiltroTipoOS valor={filtroTipo} aoMudar={setFiltroTipo} />
          </div>
        </div>

        {/* Sem items-start os cards da mesma linha esticam para a altura do mais alto —
            os que têm menos informação (sem Nota Fiscal, sem Custo Hora) param de deixar
            um degrau na grade. */}
        <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 2xl:grid-cols-3 lg:content-start lg:gap-4">
          {isLoading && (
            <EsqueletoLista quantidade={4}>
              <EsqueletoCardOS />
            </EsqueletoLista>
          )}

          {!isLoading && ordensConcluidas.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-12 text-slate-400 lg:col-span-2">
              <CircleDollarSign size={28} />
              <p className="text-sm">
                {aba === 'pendentes'
                  ? 'Nenhuma OS concluída encontrada para esses filtros.'
                  : 'Nenhuma OS revisada ainda.'}
              </p>
            </div>
          )}

          {ordensConcluidas.map((ordem, indice) => (
            <div
              key={ordem.id}
              style={atrasoEntrada(indice)}
              className="animate-surgir shadow-card hover:shadow-card-hover flex flex-col gap-3 rounded-2xl bg-white p-4 transition-shadow duration-200 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                {/* Uma linha só: sem flex-wrap o badge nunca cai para a linha de baixo,
                      então todo card tem a mesma altura de cabeçalho e a coluna alinha. */}
                <div className="flex items-center gap-2">
                  <span className="bg-marca-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold text-white">
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
                  {lojas.find((loja) => loja.id === ordem.lojaId)?.nome ??
                    ordem.lojaId}{' '}
                  · {ordem.setorNome} · Encerrada em{' '}
                  {ordem.dataFim ? formatarDataHora(ordem.dataFim) : '—'}
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
                    {ordem.custo.notasFiscais.length > 1
                      ? 'Notas Fiscais'
                      : 'Nota Fiscal'}{' '}
                    {ordem.custo.notasFiscais.length > 0 ? (
                      <span className="font-mono font-semibold text-slate-600">
                        {ordem.custo.notasFiscais
                          .map((nota) =>
                            nota.serie
                              ? `${nota.numero} / série ${nota.serie}`
                              : nota.numero,
                          )
                          .join(' · ')}
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-600">
                        ainda não informada
                      </span>
                    )}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setOrdemParaLancarCusto(ordem)}
                className="bg-marca-600 font-display shadow-card hover:shadow-card-hover focus:ring-marca-500 hover:bg-marca-800 flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition-all duration-200 focus:ring-2 focus:outline-none active:scale-[0.98]"
              >
                <CircleDollarSign size={14} />
                Editar Custos
              </button>
            </div>
          ))}
        </div>
      </main>

      {ordemParaLancarCusto && (
        <ModalLancarCustoManutencao
          ordemServico={ordemParaLancarCusto}
          aoFechar={() => setOrdemParaLancarCusto(null)}
          aoSalvar={aoSalvarCusto}
        />
      )}
    </div>
  )
}
