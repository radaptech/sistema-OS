import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, Wrench } from 'lucide-react'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { CampoBusca } from '../../componentes/CampoBusca'
import { CampoSelecao } from '../../componentes/CampoSelecao'
import { ModalConfirmarExclusao } from '../../componentes/ModalConfirmarExclusao'
import { Paginacao } from '../../componentes/Paginacao'
import { EsqueletoLista, EsqueletoLinhaCadastro } from '../../componentes/Esqueleto'
import { ImagemProgressiva } from '../../componentes/ImagemProgressiva'
import { useLojas } from '../../hooks/useLojas'
import { useMaquinas } from '../../hooks/useMaquinas'
import { useSetores } from '../../hooks/useSetores'
import { servicoMaquinas } from '../../servicos/servicoMaquinas'
import type { Maquina } from '../../tipos/maquina'
import { atrasoEntrada } from '../../utilitarios/atrasoEntrada'

const TAMANHO_PAGINA = 10

export function AdministradorMaquinas() {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [filtroLoja, setFiltroLoja] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [maquinaParaExcluir, setMaquinaParaExcluir] = useState<Maquina | null>(null)
  const [pagina, setPagina] = useState(1)

  const { data: maquinas = [], isLoading } = useMaquinas({
    lojaId: filtroLoja ? Number(filtroLoja) : undefined,
    setorId: filtroSetor ? Number(filtroSetor) : undefined,
  })
  const { data: lojas = [] } = useLojas()
  // Setor é cadastrado por loja: filtrar por loja restringe também a lista de setores.
  const { data: setores = [] } = useSetores(filtroLoja ? Number(filtroLoja) : undefined)

  // Trocar de loja invalida o setor escolhido — ele é da loja anterior. Sem zerar, o
  // filtro continua mandando aquele setorId: o select fica em branco (o id não casa com
  // nenhuma das novas options) e a lista vem vazia, sem nada na tela explicando por quê.
  // No onChange, e não num efeito sobre filtroLoja, pelo mesmo motivo de CadastrarMaquina:
  // efeito rodaria também na montagem e apagaria uma seleção legítima.
  function aoMudarLoja(novaLoja: string) {
    setFiltroLoja(novaLoja)
    setFiltroSetor('')
  }

  const { mutateAsync: excluir, isPending: excluindo } = useMutation({
    mutationFn: servicoMaquinas.deletar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maquinas'] }),
  })

  const maquinasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return maquinas.filter(
      (maquina) =>
        !termo ||
        maquina.nome.toLowerCase().includes(termo) ||
        (maquina.numeroPatrimonio ?? '').toLowerCase().includes(termo),
    )
  }, [maquinas, busca])

  const chaveFiltros = `${busca}|${filtroLoja}|${filtroSetor}`
  const [chaveFiltrosAnterior, setChaveFiltrosAnterior] = useState(chaveFiltros)
  if (chaveFiltros !== chaveFiltrosAnterior) {
    setChaveFiltrosAnterior(chaveFiltros)
    setPagina(1)
  }

  const totalPaginas = Math.max(1, Math.ceil(maquinasFiltradas.length / TAMANHO_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const maquinasPaginadas = maquinasFiltradas.slice(
    (paginaAtual - 1) * TAMANHO_PAGINA,
    paginaAtual * TAMANHO_PAGINA,
  )

  async function aoConfirmarExclusao() {
    if (!maquinaParaExcluir) {
      return
    }

    await excluir(maquinaParaExcluir.id)
    toast.success('Máquina desativada.')
    setMaquinaParaExcluir(null)
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina contexto="Painel do Administrador" titulo="Máquinas" Icone={Wrench} />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8 lg:max-w-6xl 2xl:max-w-[88rem]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome ou código..." />

          <div className="grid grid-cols-2 gap-2 sm:w-96 sm:shrink-0">
            <CampoSelecao
              rotulo="Loja"
              value={filtroLoja}
              onChange={(evento) => aoMudarLoja(evento.target.value)}
            >
              <option value="">Todas as lojas</option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome}
                </option>
              ))}
            </CampoSelecao>

            <CampoSelecao
              rotulo="Setor"
              value={filtroSetor}
              onChange={(evento) => setFiltroSetor(evento.target.value)}
            >
              <option value="">Todos os setores</option>
              {setores.map((setor) => (
                <option key={setor.id} value={setor.id}>
                  {setor.nome}
                </option>
              ))}
            </CampoSelecao>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navegar('/cadastrar-maquina')}
            className="flex items-center gap-2 rounded-xl bg-marca-600 px-4 py-2.5 font-display text-sm font-semibold text-white shadow-card transition-all duration-200 hover:shadow-card-hover hover:bg-marca-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-marca-500"
          >
            <Plus size={16} />
            Nova Máquina
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 2xl:grid-cols-3 lg:content-start lg:items-start lg:gap-4">
          {isLoading && (
            <EsqueletoLista quantidade={4}>
              <EsqueletoLinhaCadastro />
            </EsqueletoLista>
          )}

          {!isLoading && maquinasFiltradas.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-12 text-slate-400 lg:col-span-2">
              <Wrench size={28} />
              <p className="text-sm">Nenhuma máquina encontrada para esses filtros.</p>
            </div>
          )}

          {maquinasPaginadas.map((maquina, indice) => (
            <div
              key={maquina.id}
              style={atrasoEntrada(indice)}
              className="animate-surgir flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                {maquina.fotoUrl ? (
                  <ImagemProgressiva
                    src={maquina.fotoUrl}
                    alt={maquina.nome}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-marca-600 text-white">
                    <Wrench size={16} />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">
                    {maquina.nome}{' '}
                    {/* Patrimônio, não o id do banco: é por ele que a busca desta
                        mesma tela filtra, e é o número que existe na etiqueta da
                        máquina. O id só aparece quando não há patrimônio. */}
                    <span className="font-mono text-sm text-slate-400">
                      · {maquina.numeroPatrimonio || maquina.id}
                    </span>
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {lojas.find((loja) => loja.id === maquina.lojaId)?.nome ?? maquina.lojaId} ·{' '}
                    {maquina.setorNome}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => navegar(`/cadastrar-maquina/${maquina.id}`)}
                  aria-label="Editar máquina"
                  className="flex items-center justify-center rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-600 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-marca-500"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setMaquinaParaExcluir(maquina)}
                  aria-label="Desativar máquina"
                  className="flex items-center justify-center rounded-xl bg-red-50 px-3.5 py-2.5 text-red-500 shadow-sm transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {totalPaginas > 1 && (
          <Paginacao pagina={paginaAtual} totalPaginas={totalPaginas} aoMudarPagina={setPagina} />
        )}
      </main>

      {maquinaParaExcluir && (
        <ModalConfirmarExclusao
          titulo="Desativar Máquina"
          mensagem={`"${maquinaParaExcluir.nome}" sairá das listagens e deixará de gerar preventivas. Dá para reativá-la em Ativar / Desativar Máquinas.`}
          confirmando={excluindo}
          aoConfirmar={aoConfirmarExclusao}
          aoFechar={() => setMaquinaParaExcluir(null)}
        />
      )}
    </div>
  )
}
