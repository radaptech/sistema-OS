import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { CampoBusca } from '../../componentes/CampoBusca'
import { CampoSelecao } from '../../componentes/CampoSelecao'
import { ModalConfirmarExclusao } from '../../componentes/ModalConfirmarExclusao'
import { Paginacao } from '../../componentes/Paginacao'
import { EsqueletoLista, EsqueletoLinhaCadastro } from '../../componentes/Esqueleto'
import { atrasoEntrada } from '../../utilitarios/atrasoEntrada'
import { useLojas } from '../../hooks/useLojas'
import { useSetores } from '../../hooks/useSetores'
import { useUsuarios } from '../../hooks/useUsuarios'
import { servicoUsuarios } from '../../servicos/servicoUsuarios'
import type { Usuario } from '../../tipos/usuario'

const ROTULO_PERFIL: Record<Usuario['perfil'], string> = {
  solicitante: 'Solicitante',
  tecnico: 'Técnico',
  gestor: 'Gestor',
  administrador: 'Administrador',
}

export function AdministradorUsuarios() {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState<Usuario['perfil'] | ''>('')
  const [filtroLoja, setFiltroLoja] = useState('')
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Usuario | null>(null)
  const [pagina, setPagina] = useState(1)

  const { data: resposta, isLoading } = useUsuarios({
    busca: busca.trim() || undefined,
    perfil: filtroPerfil || undefined,
    lojaId: filtroLoja ? Number(filtroLoja) : undefined,
    pagina,
  })
  const { data: lojas = [] } = useLojas()
  const { data: setores = [] } = useSetores()

  const usuarios = resposta?.dados ?? []
  const totalPaginas = resposta?.totalPaginas ?? 1

  const { mutateAsync: excluir, isPending: excluindo } = useMutation({
    mutationFn: servicoUsuarios.deletar,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
        queryClient.invalidateQueries({ queryKey: ['tecnicos'] }),
      ]),
  })

  const chaveFiltros = `${busca}|${filtroPerfil}|${filtroLoja}`
  const [chaveFiltrosAnterior, setChaveFiltrosAnterior] = useState(chaveFiltros)
  if (chaveFiltros !== chaveFiltrosAnterior) {
    setChaveFiltrosAnterior(chaveFiltros)
    setPagina(1)
  }

  async function aoConfirmarExclusao() {
    if (!usuarioParaExcluir) {
      return
    }

    await excluir(usuarioParaExcluir.id)
    toast.success('Usuário excluído com sucesso.')
    setUsuarioParaExcluir(null)
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto="Painel do Administrador"
        titulo="Usuários"
        Icone={UserPlus}
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8 lg:max-w-6xl 2xl:max-w-[88rem]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CampoBusca
            valor={busca}
            aoMudar={setBusca}
            placeholder="Buscar por nome ou e-mail..."
          />

          <div className="grid grid-cols-2 gap-2 sm:w-96 sm:shrink-0">
            <CampoSelecao
              rotulo="Perfil"
              value={filtroPerfil}
              onChange={(evento) =>
                setFiltroPerfil(evento.target.value as Usuario['perfil'] | '')
              }
            >
              <option value="">Todos os perfis</option>
              <option value="solicitante">Solicitante</option>
              <option value="tecnico">Técnico</option>
              <option value="gestor">Gestor</option>
              <option value="administrador">Administrador</option>
            </CampoSelecao>

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
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navegar('/cadastrar-usuario')}
            className="flex items-center gap-2 rounded-xl bg-marca-600 px-4 py-2.5 font-display text-sm font-semibold text-white shadow-card transition-all duration-200 hover:shadow-card-hover hover:bg-marca-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-marca-500"
          >
            <Plus size={16} />
            Novo Usuário
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 2xl:grid-cols-3 lg:content-start lg:items-start lg:gap-4">
          {isLoading && (
            <EsqueletoLista quantidade={4}>
              <EsqueletoLinhaCadastro />
            </EsqueletoLista>
          )}

          {!isLoading && usuarios.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-12 text-slate-400 lg:col-span-2">
              <Users size={28} />
              <p className="text-sm">Nenhum usuário encontrado para esses filtros.</p>
            </div>
          )}

          {usuarios.map((usuario, indice) => {
            const nomesLojas = usuario.lojasIds
              .map((lojaId) => lojas.find((loja) => loja.id === lojaId)?.nome ?? `Loja ${lojaId}`)
              .join(', ')
            const nomesSetores = usuario.setoresIds
              .map(
                (setorId) =>
                  setores.find((setor) => setor.id === setorId)?.nome ?? `Setor ${setorId}`,
              )
              .join(', ')

            return (
              <div
                key={usuario.id}
                style={atrasoEntrada(indice)}
                className="animate-surgir flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800">{usuario.nome}</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                      {ROTULO_PERFIL[usuario.perfil]}
                    </span>
                    {usuario.acessoTotalSetores && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 font-mono text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/15">
                        Acesso total
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-sm text-slate-500">{usuario.email}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {nomesLojas || 'Sem loja vinculada'}
                    {usuario.setoresIds.length > 0 && ` · ${nomesSetores}`}
                  </p>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => navegar(`/cadastrar-usuario/${usuario.id}`)}
                    aria-label="Editar usuário"
                    className="flex items-center justify-center rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-600 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-marca-500"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsuarioParaExcluir(usuario)}
                    aria-label="Excluir usuário"
                    className="flex items-center justify-center rounded-xl bg-red-50 px-3.5 py-2.5 text-red-500 shadow-sm transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {totalPaginas > 1 && (
          <Paginacao pagina={pagina} totalPaginas={totalPaginas} aoMudarPagina={setPagina} />
        )}
      </main>

      {usuarioParaExcluir && (
        <ModalConfirmarExclusao
          titulo="Excluir Usuário"
          mensagem={`Tem certeza que deseja excluir "${usuarioParaExcluir.nome}"? Essa ação não pode ser desfeita.`}
          confirmando={excluindo}
          aoConfirmar={aoConfirmarExclusao}
          aoFechar={() => setUsuarioParaExcluir(null)}
        />
      )}
    </div>
  )
}
