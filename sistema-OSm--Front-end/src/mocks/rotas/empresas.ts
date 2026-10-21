import { empresas } from '../bancoMock'
import { atraso, responderJson, type Rota } from '../utilidadesMock'

export const rotasEmpresas: Rota[] = [
  {
    metodo: 'GET',
    padrao: /^\/empresas$/,
    async tratar() {
      await atraso()
      return responderJson(empresas)
    },
  },
]
