import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { CampoBusca } from '../../componentes/CampoBusca'
import { CampoSelecao } from '../../componentes/CampoSelecao'
import { ModalConfirmarExclusao } from '../../componentes/ModalConfirmarExclusao'
import { MiniaturaFoto } from '../../componentes/MiniaturaFoto'
import { Paginacao } from '../../componentes/Paginacao'
import { EsqueletoLista, EsqueletoLinhaCadastro } from '../../componentes/Esqueleto'
import { useLojas } from '../../hooks/useLojas'
import { useSetores } from '../../hooks/useSetores'
import { servicoSetores } from '../../servicos/servicoSetores'
import type { SetorCadastrado } from '../../tipos/setor'
import { atrasoEntrada } from '../../utilitarios/atrasoEntrada'

const TAMANHO_PAGINA = 10

export function AdministradorSetores() {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [filtroLoja, setFiltroLoja] = useState('')
  const [setorParaExcluir, setSetorParaExcluir] = useState<SetorCadastrado | null>(null)
  const [pagina, setPagina] = useState(1)

  const { data: setores = [], isLoading } = useSetores(filtroLoja ? Number(filtroLoja) : undefined)
  const { data: lojas = [] } = useLojas()

  const { mutateAsync: excluir, isPending: excluindo } = useMutation({
    mutationFn: servicoSetores.deletar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setores'] }),
  })

  const setoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return setores.filter((setor) => !termo || setor.nome.toLowerCase().includes(termo))
  }, [setores, busca])

  const chaveFiltros = `${busca}|${filtroLoja}`
  const [chaveFiltrosAnterior, setChaveFiltrosAnterior] = useState(chaveFiltros)
  if (chaveFiltros !== chaveFiltrosAnterior) {
    setChaveFiltrosAnterior(chaveFiltros)
    setPagina(1)
  }

  const totalPaginas = Math.max(1, Math.ceil(setoresFiltrados.length / TAMANHO_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const setoresPaginados = setoresFiltrados.slice(
    (paginaAtual - 1) * TAMANHO_PAGINA,
    paginaAtual * TAMANHO_PAGINA,
  )

  async function aoConfirmarExclusao() {
    if (!setorParaExcluir) {
      return
    }

    await excluir(setorParaExcluir.id)
    toast.success('Setor excluído com sucesso.')
    setSetorParaExcluir(null)
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina contexto="Painel do Administrador" titulo="Setores" Icone={Tag} />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8 lg:max-w-6xl 2xl:max-w-[88rem]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome..." />

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

          <button
            type="button"
            onClick={() => navegar('/cadastrar-setor')}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-marca-600 px-4 py-2.5 font-display text-sm font-semibold text-white shadow-card transition-all duration-200 hover:shadow-card-hover hover:bg-marca-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-marca-500"
          >
            <Plus size={16} />
            Novo Setor
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 2xl:grid-cols-3 lg:content-start lg:items-start lg:gap-4">
          {isLoading && (
            <EsqueletoLista quantidade={4}>
              <EsqueletoLinhaCadastro />
            </EsqueletoLista>
          )}

          {!isLoading && setoresFiltrados.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-12 text-slate-400 lg:col-span-2">
              <Tag size={28} />
              <p className="text-sm">Nenhum setor encontrado para esses filtros.</p>
            </div>
          )}

          {setoresPaginados.map((setor, indice) => (
            <div
              key={setor.id}
              style={atrasoEntrada(indice)}
              className="animate-surgir flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MiniaturaFoto fotoUrl={setor.fotoUrl} alt={setor.nome} Icone={Tag} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{setor.nome}</p>
                  <p className="truncate text-xs text-slate-400">
                    {lojas.find((loja) => loja.id === setor.lojaId)?.nome ?? setor.lojaId}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => navegar(`/cadastrar-setor/${setor.id}`)}
                  aria-label="Editar setor"
                  className="flex items-center justify-center rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-600 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-marca-500"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setSetorParaExcluir(setor)}
                  aria-label="Excluir setor"
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

      {setorParaExcluir && (
        <ModalConfirmarExclusao
          titulo="Excluir Setor"
          mensagem={`Tem certeza que deseja excluir "${setorParaExcluir.nome}"? Essa ação não pode ser desfeita.`}
          confirmando={excluindo}
          aoConfirmar={aoConfirmarExclusao}
          aoFechar={() => setSetorParaExcluir(null)}
        />
      )}
    </div>
  )
}
