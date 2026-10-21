import type { NovaLojaPayload } from '../../tipos/loja'
import { empresas, lojas } from '../bancoMock'
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

export const rotasLojas: Rota[] = [
  {
    metodo: 'GET',
    padrao: /^\/lojas$/,
    async tratar() {
      await atraso()
      return responderJson(lojas)
    },
  },
  {
    metodo: 'GET',
    padrao: /^\/lojas\/(\d+)$/,
    async tratar({ params }) {
      await atraso()
      const loja = lojas.find((item) => item.id === Number(params[0]))
      return loja ? responderJson(loja) : responderErro('Loja não encontrada.', 404)
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/lojas$/,
    async tratar({ corpo }) {
      await atraso()
      const { dados: bruto, arquivos } = extrairCorpo(corpo)
      const dados = bruto as unknown as NovaLojaPayload
      // empresaId é derivado do tenant, nunca do corpo -- igual ao back.
      const nova = {
        id: gerarId(lojas),
        nome: dados.nome,
        empresaId: empresas[0].id,
        ativa: true,
        fotoUrl: urlArquivoEnviado(arquivos, 'foto') ?? marcadorFoto(dados.nome, '#cbd5e1'),
      }
      lojas.push(nova)
      return responderJson(nova, 201)
    },
  },
  {
    metodo: 'PUT',
    padrao: /^\/lojas\/(\d+)$/,
    async tratar({ params, corpo }) {
      await atraso()
      const loja = lojas.find((item) => item.id === Number(params[0]))

      if (!loja) {
        return responderErro('Loja não encontrada.', 404)
      }

      const { dados: bruto, arquivos } = extrairCorpo(corpo)
      const dados = bruto as unknown as NovaLojaPayload
      loja.nome = dados.nome
      // Sem foto nova mantém a atual, como o COALESCE do back.
      loja.fotoUrl = urlArquivoEnviado(arquivos, 'foto') ?? loja.fotoUrl
      return responderJson(loja)
    },
  },
  {
    metodo: 'DELETE',
    padrao: /^\/lojas\/(\d+)$/,
    async tratar({ params }) {
      await atraso()
      const indice = lojas.findIndex((item) => item.id === Number(params[0]))

      if (indice === -1) {
        return responderErro('Loja não encontrada.', 404)
      }

      lojas.splice(indice, 1)
      return responderJson(null)
    },
  },
]
