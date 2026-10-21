import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleDollarSign } from 'lucide-react'
import { toast } from 'react-toastify'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { CampoBusca } from '../../componentes/CampoBusca'
import { FiltroTipoOS } from '../../componentes/FiltroTipoOS'
import { NavegacaoLojaSetorPaginada } from '../../componentes/NavegacaoLojaSetorPaginada'
import { useResumoOrdensServico } from '../../hooks/useResumoOrdensServico'
import {
  servicoOrdensServico,
  type ParametrosListagemOrdensServico,
} from '../../servicos/servicoOrdensServico'
import type { OrdemServico, TipoOS } from '../../tipos/ordemServico'
import { ModalLancarCustoManutencao } from './componentes/ModalLancarCustoManutencao'
import type { DadosLancarCustoManutencao } from './esquemaLancarCustoManutencao'
import { FiltroRevisaoCusto } from './componentes/FiltroRevisaoCusto'
import type { AbaRevisaoCusto } from './componentes/FiltroRevisaoCusto'
import { CardCustoOS } from './componentes/CardCustoOS'

export function AdministradorCustosPendentes() {
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoOS | ''>('')
  const [ordemParaLancarCusto, setOrdemParaLancarCusto] =
    useState<OrdemServico | null>(null)
  const [aba, setAba] = useState<AbaRevisaoCusto>('pendentes')

  // Toda OS Concluída, com ou sem custo lançado: o Técnico já grava os dois custos no
  // encerramento e o Administrador só corrige se quiser — inclusive nas OS que foram
  // executadas por empresa externa, que também passam pelo Técnico.
  //
  // Navegada Loja → Setor (NavegacaoLojaSetorPaginada, a mesma das OS Finalizadas do Gestor):
  // os cards saem do resumo e só o setor aberto busca a página, 12 por vez, com `?revisado=`
  // no servidor — "Revisadas" é histórico e só cresce. Loja e setor são a própria navegação,
  // então saíram dos filtros; o nível mora na URL e continua ao trocar de aba.
  const filtros: ParametrosListagemOrdensServico = {
    status: ['Concluída'],
    busca: busca.trim() || undefined,
    tipo: filtroTipo || undefined,
  }
  const filtrosPendentes = { ...filtros, revisado: false }
  const filtrosRevisadas = { ...filtros, revisado: true }

  // As pílulas mostram as duas contagens: a soma do resumo de cada aba. A da aba aberta é a
  // mesma chave que a navegação usa, então o React Query não busca duas vezes.
  const { data: resumoPendentes = [] } = useResumoOrdensServico(filtrosPendentes)
  const { data: resumoRevisadas = [] } = useResumoOrdensServico(filtrosRevisadas)
  const somar = (linhas: { quantidade: number }[]) =>
    linhas.reduce((total, linha) => total + linha.quantidade, 0)

  const { mutateAsync: lancarCusto } = useMutation({
    mutationFn: servicoOrdensServico.lancarCustoManutencao,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-todas'] }),
  })

  async function aoSalvarCusto(dados: DadosLancarCustoManutencao) {
    if (!ordemParaLancarCusto) {
      return
    }

    await lancarCusto({ ordemServicoId: ordemParaLancarCusto.id, ...dados })
    // Sem marcar nada aqui: o POST /custo grava custo.revisadoEm no servidor e o
    // onSuccess da mutation invalida lista e resumo — a OS reaparece já em "Revisadas".
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
            pendentes: somar(resumoPendentes),
            revisadas: somar(resumoRevisadas),
          }}
        />

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

        <NavegacaoLojaSetorPaginada
          filtros={aba === 'pendentes' ? filtrosPendentes : filtrosRevisadas}
          IconeVazio={CircleDollarSign}
          mensagemVazio={
            aba === 'pendentes'
              ? 'Nenhuma OS concluída esperando conferência para esses filtros.'
              : 'Nenhuma OS revisada para esses filtros.'
          }
          rotuloNavegacao="Navegação dos custos"
          emGrade
          renderItem={(ordem) => (
            <CardCustoOS ordem={ordem} aoEditarCustos={setOrdemParaLancarCusto} />
          )}
        />
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
