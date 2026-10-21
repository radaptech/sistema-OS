import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Power, PowerOff, Trash2, Wrench } from 'lucide-react'
import { toast } from 'react-toastify'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { CampoBusca } from '../../componentes/CampoBusca'
import { CampoSelecao } from '../../componentes/CampoSelecao'
import { Paginacao } from '../../componentes/Paginacao'
import { EsqueletoLista, EsqueletoLinhaCadastro } from '../../componentes/Esqueleto'
import { MiniaturaFoto } from '../../componentes/MiniaturaFoto'
import { useMaquinas } from '../../hooks/useMaquinas'
import { servicoMaquinas } from '../../servicos/servicoMaquinas'
import type { Maquina } from '../../tipos/maquina'
import { atrasoEntrada } from '../../utilitarios/atrasoEntrada'
import { ModalExcluirMaquinaDefinitivo } from './componentes/ModalExcluirMaquinaDefinitivo'

const TAMANHO_PAGINA = 10

// Desativar é reversível (some das listagens e o job de preventiva para de abrir OS para
// ela), por isso vai sem modal. Exclusão definitiva é a única coisa irreversível da tela,
// e é ela que pede patrimônio + senha.
export function AdministradorStatusMaquinas() {
  const queryClient = useQueryClient()
  const [mostrarInativas, setMostrarInativas] = useState(false)
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [maquinaParaExcluir, setMaquinaParaExcluir] = useState<Maquina | null>(null)

  const { data: maquinas = [], isLoading } = useMaquinas({
    ativa: mostrarInativas ? false : undefined,
  })

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['maquinas'] })

  // Erro já vira toast no api.ts (409 "OS em aberto", 403 "senha incorreta"); aqui só o sucesso.
  const { mutate: desativar, isPending: desativando } = useMutation({
    mutationFn: servicoMaquinas.deletar,
    onSuccess: () => {
      toast.success('Máquina desativada.')
      invalidar()
    },
  })

  const { mutate: reativar, isPending: reativando } = useMutation({
    mutationFn: servicoMaquinas.reativar,
    onSuccess: () => {
      toast.success('Máquina reativada.')
      invalidar()
    },
  })

  const { mutate: excluir, isPending: excluindo } = useMutation({
    mutationFn: ({ id, senha, confirmacao }: { id: number; senha: string; confirmacao: string }) =>
      servicoMaquinas.excluirDefinitivo(id, senha, confirmacao),
    onSuccess: () => {
      toast.success('Máquina e histórico excluídos definitivamente.')
      setMaquinaParaExcluir(null)
      invalidar()
    },
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

  const chaveFiltros = `${busca}|${mostrarInativas}`
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

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto="Painel do Administrador"
        titulo="Ativar / Desativar Máquinas"
        Icone={Power}
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8 lg:max-w-6xl 2xl:max-w-[88rem]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome ou patrimônio..." />

          <div className="sm:w-56 sm:shrink-0">
            <CampoSelecao
              rotulo="Situação"
              value={mostrarInativas ? 'inativas' : 'ativas'}
              onChange={(evento) => setMostrarInativas(evento.target.value === 'inativas')}
            >
              <option value="ativas">Ativas</option>
              <option value="inativas">Desativadas</option>
            </CampoSelecao>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 2xl:grid-cols-3 lg:content-start lg:items-stretch lg:gap-4">
          {isLoading && (
            <EsqueletoLista quantidade={4}>
              <EsqueletoLinhaCadastro />
            </EsqueletoLista>
          )}

          {!isLoading && maquinasFiltradas.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-12 text-slate-400 lg:col-span-2">
              <Wrench size={28} />
              <p className="text-sm">
                {mostrarInativas ? 'Nenhuma máquina desativada.' : 'Nenhuma máquina encontrada.'}
              </p>
            </div>
          )}

          {maquinasPaginadas.map((maquina, indice) => (
            <div
              key={maquina.id}
              style={atrasoEntrada(indice)}
              className="animate-surgir flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
            >
              {/* Patrimônio numa linha própria e sem truncar: é ele que diferencia máquinas
                  iguais (mesmo nome), e na mesma linha do nome o truncate o cortava
                  primeiro. O nome quebra em até duas linhas em vez de esconder o resto. */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <MiniaturaFoto
                  fotoUrl={maquina.fotoUrl}
                  alt={maquina.nome}
                  Icone={Wrench}
                  className="h-14 w-14 rounded-xl"
                  tamanhoIcone={20}
                />
                <div className="min-w-0">
                  <p className="line-clamp-2 leading-snug font-semibold text-slate-800">
                    {maquina.nome}
                  </p>
                  <p className="mt-0.5 font-mono text-xs font-semibold whitespace-nowrap text-slate-600">
                    {maquina.numeroPatrimonio || `#${maquina.id}`}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {maquina.lojaNome ?? maquina.lojaId} · {maquina.setorNome}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:shrink-0">
                {mostrarInativas ? (
                  <button
                    type="button"
                    disabled={reativando}
                    onClick={() => reativar(maquina.id)}
                    className="flex items-center gap-2 rounded-xl bg-marca-100 px-3.5 py-2.5 text-sm font-semibold text-marca-900 shadow-sm transition hover:bg-marca-300/30 focus:outline-none focus:ring-2 focus:ring-marca-500 disabled:opacity-50"
                  >
                    <Power size={16} />
                    Reativar
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={desativando}
                    onClick={() => desativar(maquina.id)}
                    className="flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-marca-500 disabled:opacity-50"
                  >
                    <PowerOff size={16} />
                    Desativar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMaquinaParaExcluir(maquina)}
                  aria-label="Excluir definitivamente"
                  title="Excluir definitivamente"
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
        <ModalExcluirMaquinaDefinitivo
          maquina={maquinaParaExcluir}
          confirmando={excluindo}
          aoConfirmar={(senha, confirmacao) =>
            excluir({ id: maquinaParaExcluir.id, senha, confirmacao })
          }
          aoFechar={() => setMaquinaParaExcluir(null)}
        />
      )}
    </div>
  )
}
