import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { CampoBusca } from '../../componentes/CampoBusca'
import { ModalConfirmarExclusao } from '../../componentes/ModalConfirmarExclusao'
import { MiniaturaFoto } from '../../componentes/MiniaturaFoto'
import { Paginacao } from '../../componentes/Paginacao'
import { EsqueletoLista, EsqueletoLinhaCadastro } from '../../componentes/Esqueleto'
import { useEmpresasTerceirizadas } from '../../hooks/useEmpresasTerceirizadas'
import { servicoEmpresasTerceirizadas } from '../../servicos/servicoEmpresasTerceirizadas'
import type { EmpresaTerceirizada } from '../../tipos/empresaTerceirizada'
import { atrasoEntrada } from '../../utilitarios/atrasoEntrada'

const TAMANHO_PAGINA = 10

export function AdministradorEmpresasTerceirizadas() {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [empresaParaExcluir, setEmpresaParaExcluir] = useState<EmpresaTerceirizada | null>(
    null,
  )
  const [pagina, setPagina] = useState(1)

  const { data: empresas = [], isLoading } = useEmpresasTerceirizadas()

  const { mutateAsync: excluir, isPending: excluindo } = useMutation({
    mutationFn: servicoEmpresasTerceirizadas.deletar,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['empresas-terceirizadas'] }),
  })

  const empresasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return empresas.filter(
      (empresa) =>
        !termo ||
        empresa.nome.toLowerCase().includes(termo) ||
        empresa.especialidade?.toLowerCase().includes(termo),
    )
  }, [empresas, busca])

  const [buscaAnterior, setBuscaAnterior] = useState(busca)
  if (busca !== buscaAnterior) {
    setBuscaAnterior(busca)
    setPagina(1)
  }

  const totalPaginas = Math.max(1, Math.ceil(empresasFiltradas.length / TAMANHO_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const empresasPaginadas = empresasFiltradas.slice(
    (paginaAtual - 1) * TAMANHO_PAGINA,
    paginaAtual * TAMANHO_PAGINA,
  )

  async function aoConfirmarExclusao() {
    if (!empresaParaExcluir) {
      return
    }

    await excluir(empresaParaExcluir.id)
    toast.success('Empresa terceirizada excluída com sucesso.')
    setEmpresaParaExcluir(null)
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto="Painel do Administrador"
        titulo="Empresas Terceirizadas"
        Icone={Building2}
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8 lg:max-w-6xl 2xl:max-w-[88rem]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CampoBusca
            valor={busca}
            aoMudar={setBusca}
            placeholder="Buscar por nome ou especialidade..."
          />

          <button
            type="button"
            onClick={() => navegar('/cadastrar-empresa-terceirizada')}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-marca-600 px-4 py-2.5 font-display text-sm font-semibold text-white shadow-card transition-all duration-200 hover:shadow-card-hover hover:bg-marca-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-marca-500"
          >
            <Plus size={16} />
            Nova Empresa
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 2xl:grid-cols-3 lg:content-start lg:items-start lg:gap-4">
          {isLoading && (
            <EsqueletoLista quantidade={4}>
              <EsqueletoLinhaCadastro />
            </EsqueletoLista>
          )}

          {!isLoading && empresasFiltradas.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-12 text-slate-400 lg:col-span-2">
              <Building2 size={28} />
              <p className="text-sm">Nenhuma empresa terceirizada encontrada para esses filtros.</p>
            </div>
          )}

          {empresasPaginadas.map((empresa, indice) => (
            <div
              key={empresa.id}
              style={atrasoEntrada(indice)}
              className="animate-surgir flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MiniaturaFoto fotoUrl={empresa.fotoUrl} alt={empresa.nome} Icone={Building2} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{empresa.nome}</p>
                  <p className="truncate text-xs text-slate-400">
                    {empresa.especialidade ?? 'Sem especialidade informada'}
                  </p>
                  {empresa.telefone && (
                    <p className="flex items-center gap-1 truncate font-mono text-xs text-slate-400">
                      <Phone size={10} />
                      {empresa.telefone}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => navegar(`/cadastrar-empresa-terceirizada/${empresa.id}`)}
                  aria-label="Editar empresa terceirizada"
                  className="flex items-center justify-center rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-600 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-marca-500"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setEmpresaParaExcluir(empresa)}
                  aria-label="Excluir empresa terceirizada"
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

      {empresaParaExcluir && (
        <ModalConfirmarExclusao
          titulo="Excluir Empresa Terceirizada"
          mensagem={`Tem certeza que deseja excluir "${empresaParaExcluir.nome}"? Essa ação não pode ser desfeita.`}
          confirmando={excluindo}
          aoConfirmar={aoConfirmarExclusao}
          aoFechar={() => setEmpresaParaExcluir(null)}
        />
      )}
    </div>
  )
}
