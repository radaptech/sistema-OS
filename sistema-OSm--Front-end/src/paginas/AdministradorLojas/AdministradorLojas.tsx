import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Store, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { CampoBusca } from '../../componentes/CampoBusca'
import { ModalConfirmarExclusao } from '../../componentes/ModalConfirmarExclusao'
import { MiniaturaFoto } from '../../componentes/MiniaturaFoto'
import { Paginacao } from '../../componentes/Paginacao'
import { EsqueletoLista, EsqueletoLinhaCadastro } from '../../componentes/Esqueleto'
import { useEmpresas } from '../../hooks/useEmpresas'
import { useLojas } from '../../hooks/useLojas'
import { servicoLojas } from '../../servicos/servicoLojas'
import type { Loja } from '../../tipos/loja'
import { atrasoEntrada } from '../../utilitarios/atrasoEntrada'

const TAMANHO_PAGINA = 10

export function AdministradorLojas() {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [lojaParaExcluir, setLojaParaExcluir] = useState<Loja | null>(null)
  const [pagina, setPagina] = useState(1)

  const { data: lojas = [], isLoading } = useLojas()
  const { data: empresas = [] } = useEmpresas()

  const { mutateAsync: excluir, isPending: excluindo } = useMutation({
    mutationFn: servicoLojas.deletar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lojas'] }),
  })

  const lojasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return lojas.filter((loja) => !termo || loja.nome.toLowerCase().includes(termo))
  }, [lojas, busca])

  const [buscaAnterior, setBuscaAnterior] = useState(busca)
  if (busca !== buscaAnterior) {
    setBuscaAnterior(busca)
    setPagina(1)
  }

  const totalPaginas = Math.max(1, Math.ceil(lojasFiltradas.length / TAMANHO_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const lojasPaginadas = lojasFiltradas.slice(
    (paginaAtual - 1) * TAMANHO_PAGINA,
    paginaAtual * TAMANHO_PAGINA,
  )

  async function aoConfirmarExclusao() {
    if (!lojaParaExcluir) {
      return
    }

    await excluir(lojaParaExcluir.id)
    toast.success('Loja excluída com sucesso.')
    setLojaParaExcluir(null)
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina contexto="Painel do Administrador" titulo="Lojas" Icone={Store} />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8 lg:max-w-6xl 2xl:max-w-[88rem]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome..." />

          <button
            type="button"
            onClick={() => navegar('/cadastrar-loja')}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-marca-600 px-4 py-2.5 font-display text-sm font-semibold text-white shadow-card transition-all duration-200 hover:shadow-card-hover hover:bg-marca-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-marca-500"
          >
            <Plus size={16} />
            Nova Loja
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 2xl:grid-cols-3 lg:content-start lg:items-start lg:gap-4">
          {isLoading && (
            <EsqueletoLista quantidade={4}>
              <EsqueletoLinhaCadastro />
            </EsqueletoLista>
          )}

          {!isLoading && lojasFiltradas.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-12 text-slate-400 lg:col-span-2">
              <Store size={28} />
              <p className="text-sm">Nenhuma loja encontrada para esses filtros.</p>
            </div>
          )}

          {lojasPaginadas.map((loja, indice) => (
            <div
              key={loja.id}
              style={atrasoEntrada(indice)}
              className="animate-surgir flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MiniaturaFoto fotoUrl={loja.fotoUrl} alt={loja.nome} Icone={Store} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{loja.nome}</p>
                  <p className="truncate text-xs text-slate-400">
                    {empresas.find((empresa) => empresa.id === loja.empresaId)?.nome ??
                      loja.empresaId}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => navegar(`/cadastrar-loja/${loja.id}`)}
                  aria-label="Editar loja"
                  className="flex items-center justify-center rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-600 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-marca-500"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setLojaParaExcluir(loja)}
                  aria-label="Excluir loja"
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

      {lojaParaExcluir && (
        <ModalConfirmarExclusao
          titulo="Excluir Loja"
          mensagem={`Tem certeza que deseja excluir "${lojaParaExcluir.nome}"? Essa ação não pode ser desfeita.`}
          confirmando={excluindo}
          aoConfirmar={aoConfirmarExclusao}
          aoFechar={() => setLojaParaExcluir(null)}
        />
      )}
    </div>
  )
}
