import type { CicloPreventiva, PreventivaListada, PreventivaManutencao } from '../../tipos/maquina'
import {
  lojas,
  maquinas,
  obterUsuarioSessao,
  ordensServico,
  preventivas,
  solicitacoes,
  usuarios,
  type PreventivaInterna,
} from '../bancoMock'
import { preventivaEstaVencida, sincronizarPreventivasVencidas, usuarioAlcanca } from '../regrasMock'
import { atraso, gerarId, responderErro, responderJson, type Rota } from '../utilidadesMock'

function paraPreventivaListada(preventiva: PreventivaInterna): PreventivaListada | null {
  const maquina = maquinas.find((item) => item.id === preventiva.maquinaId)

  if (!maquina) {
    return null
  }

  return {
    id: preventiva.id,
    maquinaId: preventiva.maquinaId,
    tecnicoId: preventiva.tecnicoId,
    tecnicoNome: usuarios.find((item) => item.id === preventiva.tecnicoId)?.nome,
    descricao: preventiva.descricao,
    intervaloDias: preventiva.intervaloDias,
    proximaData: preventiva.proximaData,
    ativa: preventiva.ativa,
    maquinaNome: maquina.nome,
    maquinaPatrimonio: maquina.numeroPatrimonio,
    maquinaFotoUrl: maquina.fotoUrl,
    setorId: maquina.setorId,
    setorNome: maquina.setorNome,
    lojaId: maquina.lojaId,
    lojaNome: maquina.lojaNome ?? lojas.find((item) => item.id === maquina.lojaId)?.nome,
    vencida: preventivaEstaVencida(preventiva),
  }
}

export const rotasPreventivas: Rota[] = [
  {
    metodo: 'GET',
    padrao: /^\/preventivas$/,
    async tratar({ query }) {
      await atraso()
      sincronizarPreventivasVencidas()

      let lista = preventivas
      const maquinaId = query.get('maquinaId')
      if (maquinaId) {
        lista = lista.filter((preventiva) => preventiva.maquinaId === Number(maquinaId))
      }

      const usuario = obterUsuarioSessao()
      if (!usuario) {
        return responderErro('Não autenticado.', 401)
      }

      const listadas = lista
        .map(paraPreventivaListada)
        .filter((item): item is PreventivaListada => item !== null)
        .filter((item) => usuarioAlcanca(usuario, item.lojaId, item.setorId))

      return responderJson(listadas)
    },
  },
  {
    // Espelha ListarHistoricoPreventiva do back: um ciclo por solicitação automática
    // da preventiva, com a OS que nasceu dela, mais recente primeiro.
    metodo: 'GET',
    padrao: /^\/preventivas\/(\d+)\/historico$/,
    async tratar({ params }) {
      await atraso()
      sincronizarPreventivasVencidas()

      const usuario = obterUsuarioSessao()
      if (!usuario) {
        return responderErro('Não autenticado.', 401)
      }

      const preventiva = preventivas.find((item) => item.id === Number(params[0]))
      const listada = preventiva ? paraPreventivaListada(preventiva) : null
      if (!listada || !usuarioAlcanca(usuario, listada.lojaId, listada.setorId)) {
        return responderErro('Preventiva não encontrada.', 404)
      }

      const ciclos: CicloPreventiva[] = solicitacoes
        .filter((solicitacao) => solicitacao.preventivaId === listada.id)
        .flatMap((solicitacao) => {
          const ordem = ordensServico.find((item) => item.solicitacaoId === solicitacao.id)
          return ordem
            ? [
                {
                  id: ordem.id,
                  status: ordem.statusExecucao,
                  dataAbertura: ordem.dataSolicitacao,
                  dataInicio: ordem.dataInicio,
                  dataFim: ordem.dataFim,
                  tecnicoNome: ordem.tecnicoNome ?? '—',
                },
              ]
            : []
        })
        .sort((a, b) => b.id - a.id)

      return responderJson(ciclos)
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/preventivas$/,
    async tratar({ corpo }) {
      await atraso()
      const dados = corpo as PreventivaManutencao
      const maquina = maquinas.find((item) => item.id === dados.maquinaId)

      if (!maquina) {
        return responderErro('Máquina não encontrada.', 404)
      }

      const nova: PreventivaInterna = {
        id: gerarId(preventivas),
        maquinaId: dados.maquinaId,
        tecnicoId: dados.tecnicoId,
        descricao: dados.descricao,
        intervaloDias: dados.intervaloDias,
        proximaData: dados.proximaData,
        ativa: dados.ativa,
      }

      preventivas.push(nova)
      return responderJson(paraPreventivaListada(nova), 201)
    },
  },
  {
    metodo: 'PUT',
    padrao: /^\/preventivas\/(\d+)$/,
    async tratar({ params, corpo }) {
      await atraso()
      const preventiva = preventivas.find((item) => item.id === Number(params[0]))

      if (!preventiva) {
        return responderErro('Preventiva não encontrada.', 404)
      }

      const dados = corpo as PreventivaManutencao
      // tecnicoId ENTRA na edição, diferente de maquinaId: trocar quem atende a
      // preventiva é o que a edição serve para fazer, e não desfaz as OS já abertas.
      preventiva.tecnicoId = dados.tecnicoId
      preventiva.descricao = dados.descricao
      preventiva.intervaloDias = dados.intervaloDias
      preventiva.proximaData = dados.proximaData
      preventiva.ativa = dados.ativa

      return responderJson(paraPreventivaListada(preventiva))
    },
  },
  {
    metodo: 'DELETE',
    padrao: /^\/preventivas\/(\d+)$/,
    async tratar({ params }) {
      await atraso()
      const indice = preventivas.findIndex((item) => item.id === Number(params[0]))

      if (indice === -1) {
        return responderErro('Preventiva não encontrada.', 404)
      }

      preventivas.splice(indice, 1)
      return responderJson(null)
    },
  },
]
