import { obterUsuarioSessao } from '../bancoMock'
import {
  computarIndicadores,
  computarIndicadoresLoja,
  construirEscoposGestor,
  listarOrdensDoPainelMock,
} from '../regrasMock'
import {
  atraso,
  responderErro,
  responderJson,
  type Rota,
} from '../utilidadesMock'

export const rotasIndicadores: Rota[] = [
  {
    metodo: 'GET',
    padrao: /^\/indicadores\/maquinas\/(\d+)$/,
    async tratar({ params }) {
      await atraso()
      return responderJson(computarIndicadores(Number(params[0])))
    },
  },
  {
    metodo: 'GET',
    padrao: /^\/indicadores\/lojas\/(\d+)$/,
    async tratar({ params }) {
      await atraso()
      const usuario = obterUsuarioSessao()
      if (!usuario) {
        return responderErro('Não autenticado.', 401)
      }
      // Loja fora do escopo é 404, como no servidor — não um painel zerado.
      const lojaId = Number(params[0])
      if (
        usuario.perfil !== 'administrador' &&
        !construirEscoposGestor(usuario).some(
          (escopo) => escopo.lojaId === lojaId,
        )
      ) {
        return responderErro('Loja não encontrada.', 404)
      }
      return responderJson(computarIndicadoresLoja(lojaId, usuario))
    },
  },
  {
    metodo: 'GET',
    padrao: /^\/indicadores\/lojas\/(\d+)\/ordens$/,
    async tratar({ params, query }) {
      await atraso()
      const usuario = obterUsuarioSessao()
      if (!usuario) {
        return responderErro('Não autenticado.', 401)
      }
      const lojaId = Number(params[0])
      if (
        usuario.perfil !== 'administrador' &&
        !construirEscoposGestor(usuario).some((escopo) => escopo.lojaId === lojaId)
      ) {
        return responderErro('Loja não encontrada.', 404)
      }
      const grupo = query.get('grupo')
      if (grupo !== 'maquinario' && grupo !== 'reparos' && grupo !== 'preventivas') {
        return responderErro('grupo inválido (use maquinario, reparos ou preventivas)', 400)
      }
      const setorId = query.get('setorId')
      const maquinaId = query.get('maquinaId')
      return responderJson(
        listarOrdensDoPainelMock(
          lojaId,
          usuario,
          grupo,
          setorId ? Number(setorId) : null,
          maquinaId ? Number(maquinaId) : null,
          query.get('mes'),
          Number(query.get('pagina') ?? 1),
        ),
      )
    },
  },
]
