import type {
  AtualizarMaquinaPayload,
  HistoricoMaquina,
  Maquina,
  NovaMaquinaPayload,
} from '../../tipos/maquina'
import {
  lojas,
  maquinas,
  obterUsuarioSessao,
  ordensServico,
  preventivas,
  setores,
  solicitacoes,
  type PreventivaInterna,
} from '../bancoMock'
import { usuarioAlcanca } from '../regrasMock'
import {
  atraso,
  extrairCorpo,
  gerarId,
  marcadorFoto,
  responderErro,
  responderJson,
  urlArquivoEnviado,
  type Rota,
} from '../utilidadesMock'

// Mesma regra do servidor (sincronizarPreventivas): a que volta com id é atualizada no
// lugar, a sem id é nova e a que não veio sai. Recriar todas trocaria o id e o histórico
// da preventiva sumiria a cada edição da máquina.
function gravarPreventivas(maquinaId: number, itens: NovaMaquinaPayload['preventivas']): void {
  const manter = new Set(itens.map((item) => item.id).filter((id) => id !== undefined))
  for (let indice = preventivas.length - 1; indice >= 0; indice -= 1) {
    if (preventivas[indice].maquinaId === maquinaId && !manter.has(preventivas[indice].id)) {
      preventivas.splice(indice, 1)
    }
  }

  for (const item of itens) {
    const existente = preventivas.find(
      (preventiva) => preventiva.id === item.id && preventiva.maquinaId === maquinaId,
    )
    const dados = {
      tecnicoId: item.tecnicoId,
      descricao: item.descricao,
      intervaloDias: item.intervaloDias,
      proximaData: item.proximaData,
      ativa: item.ativa,
    }
    if (existente) {
      Object.assign(existente, dados)
      continue
    }
    const nova: PreventivaInterna = { id: gerarId(preventivas), maquinaId, ...dados }
    preventivas.push(nova)
  }
}

export const rotasMaquinas: Rota[] = [
  {
    metodo: 'GET',
    padrao: /^\/maquinas$/,
    async tratar({ query }) {
      await atraso()
      const usuario = obterUsuarioSessao()
      if (!usuario) {
        return responderErro('Não autenticado.', 401)
      }
      // ?ativa=false só vale para o administrador, como no servidor.
      const inativas = query.get('ativa') === 'false' && usuario.perfil === 'administrador'
      let lista = maquinas.filter(
        (maquina) =>
          (maquina.ativa !== false) !== inativas && usuarioAlcanca(usuario, maquina.lojaId, maquina.setorId),
      )

      const setorId = query.get('setorId')
      if (setorId) {
        lista = lista.filter((maquina) => maquina.setorId === Number(setorId))
      }

      const lojaId = query.get('lojaId')
      if (lojaId) {
        lista = lista.filter((maquina) => maquina.lojaId === Number(lojaId))
      }

      return responderJson(lista)
    },
  },
  {
    metodo: 'GET',
    padrao: /^\/maquinas\/(\d+)$/,
    async tratar({ params }) {
      await atraso()
      const maquina = maquinas.find((item) => item.id === Number(params[0]))
      return maquina ? responderJson(maquina) : responderErro('Máquina não encontrada.', 404)
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/maquinas$/,
    async tratar({ corpo }) {
      await atraso()
      const { dados, arquivos } = extrairCorpo(corpo)
      const payload = dados as unknown as NovaMaquinaPayload

      if (!payload.preventivas || payload.preventivas.length === 0) {
        return responderErro('Cadastre ao menos uma manutenção preventiva.', 400)
      }

      const setor = setores.find((item) => item.id === payload.setorId)
      if (!setor) {
        return responderErro('Setor não encontrado.', 404)
      }

      const nova: Maquina = {
        id: gerarId(maquinas),
        nome: payload.nome,
        numeroPatrimonio: payload.numeroPatrimonio,
        serie: payload.serie,
        descricao: payload.descricao,
        marca: payload.marca,
        modelo: payload.modelo,
        criticidade: payload.criticidade,
        setorId: setor.id,
        setorNome: setor.nome,
        lojaId: setor.lojaId,
        lojaNome: lojas.find((item) => item.id === setor.lojaId)?.nome,
        fotoUrl: urlArquivoEnviado(arquivos, 'foto') ?? marcadorFoto(payload.nome),
      }

      maquinas.push(nova)
      gravarPreventivas(nova.id, payload.preventivas)

      return responderJson(nova, 201)
    },
  },
  {
    metodo: 'PUT',
    padrao: /^\/maquinas\/(\d+)$/,
    async tratar({ params, corpo }) {
      await atraso()
      const maquina = maquinas.find((item) => item.id === Number(params[0]))

      if (!maquina) {
        return responderErro('Máquina não encontrada.', 404)
      }

      const { dados, arquivos } = extrairCorpo(corpo)
      const payload = dados as unknown as AtualizarMaquinaPayload

      if (!payload.preventivas || payload.preventivas.length === 0) {
        return responderErro('Cadastre ao menos uma manutenção preventiva.', 400)
      }

      const setor = setores.find((item) => item.id === payload.setorId)
      if (!setor) {
        return responderErro('Setor não encontrado.', 404)
      }

      maquina.nome = payload.nome
      maquina.numeroPatrimonio = payload.numeroPatrimonio
      maquina.serie = payload.serie
      maquina.descricao = payload.descricao
      maquina.marca = payload.marca
      maquina.modelo = payload.modelo
      maquina.criticidade = payload.criticidade
      maquina.setorId = setor.id
      maquina.setorNome = setor.nome
      maquina.lojaId = setor.lojaId
      maquina.lojaNome = lojas.find((item) => item.id === setor.lojaId)?.nome

      const fotoUrl = urlArquivoEnviado(arquivos, 'foto')
      if (fotoUrl) {
        maquina.fotoUrl = fotoUrl
      }

      gravarPreventivas(maquina.id, payload.preventivas)

      return responderJson(maquina)
    },
  },
  {
    // Soft delete, como no servidor: recusa com solicitação/OS em aberto.
    metodo: 'DELETE',
    padrao: /^\/maquinas\/(\d+)$/,
    async tratar({ params }) {
      await atraso()
      const maquina = maquinas.find((item) => item.id === Number(params[0]))

      if (!maquina) {
        return responderErro('Máquina não encontrada.', 404)
      }

      if (historicoDaMaquina(maquina.id).emAberto > 0) {
        return responderErro(
          'a máquina tem solicitação ou OS em aberto; conclua ou rejeite antes de desativar',
          409,
        )
      }

      maquina.ativa = false
      return responderJson(null)
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/maquinas\/(\d+)\/reativar$/,
    async tratar({ params }) {
      await atraso()
      const maquina = maquinas.find((item) => item.id === Number(params[0]))

      if (!maquina) {
        return responderErro('Máquina não encontrada.', 404)
      }

      maquina.ativa = true
      return responderJson(null)
    },
  },
  {
    metodo: 'GET',
    padrao: /^\/maquinas\/(\d+)\/historico$/,
    async tratar({ params }) {
      await atraso()
      const id = Number(params[0])
      return maquinas.some((item) => item.id === id)
        ? responderJson(historicoDaMaquina(id))
        : responderErro('Máquina não encontrada.', 404)
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/maquinas\/(\d+)\/excluir$/,
    async tratar({ params, corpo }) {
      await atraso()
      const id = Number(params[0])
      const { senha, confirmacao } = corpo as { senha: string; confirmacao: string }
      const maquina = maquinas.find((item) => item.id === id)

      if (obterUsuarioSessao()?.senha !== senha) {
        return responderErro('senha incorreta', 403)
      }
      if (!maquina) {
        return responderErro('Máquina não encontrada.', 404)
      }
      if (confirmacao.trim() !== maquina.numeroPatrimonio) {
        return responderErro('dados inválidos: o patrimônio digitado não confere com o da máquina', 400)
      }

      remover(ordensServico, (os) => os.maquinaId === id)
      remover(solicitacoes, (sol) => sol.maquinaId === id)
      remover(preventivas, (prev) => prev.maquinaId === id)
      remover(maquinas, (item) => item.id === id)

      return responderJson(null)
    },
  },
]

function remover<T>(lista: T[], casa: (item: T) => boolean): void {
  for (let i = lista.length - 1; i >= 0; i -= 1) {
    if (casa(lista[i])) {
      lista.splice(i, 1)
    }
  }
}

function historicoDaMaquina(id: number): HistoricoMaquina {
  const doMaquina = ordensServico.filter((os) => os.maquinaId === id)
  const sols = solicitacoes.filter((sol) => sol.maquinaId === id)
  return {
    solicitacoes: sols.length,
    ordensServico: doMaquina.length,
    notasFiscais: doMaquina.reduce((total, os) => total + (os.custo?.notasFiscais?.length ?? 0), 0),
    preventivas: preventivas.filter((prev) => prev.maquinaId === id).length,
    emAberto:
      sols.filter((sol) => sol.status === 'Pendente').length +
      doMaquina.filter((os) => os.statusExecucao !== 'Concluída').length,
  }
}
