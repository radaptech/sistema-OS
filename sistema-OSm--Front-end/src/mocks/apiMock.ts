import { rotasAutenticacao } from './rotas/autenticacao'
import { rotasEmpresas } from './rotas/empresas'
import { rotasEmpresasTerceirizadas } from './rotas/empresasTerceirizadas'
import { rotasIndicadores } from './rotas/indicadores'
import { rotasLojas } from './rotas/lojas'
import { rotasMaquinas } from './rotas/maquinas'
import { rotasNotificacoes } from './rotas/notificacoes'
import { rotasOrdensServico } from './rotas/ordensServico'
import { rotasPreventivas } from './rotas/preventivas'
import { rotasPush } from './rotas/push'
import { rotasSetores } from './rotas/setores'
import { rotasSolicitacoes } from './rotas/solicitacoes'
import { rotasTecnicos, rotasUsuarios } from './rotas/usuarios'
import './historicoMock'
import { responderErro, type MetodoHttp, type Rota } from './utilidadesMock'

const rotas: Rota[] = [
  ...rotasAutenticacao,
  ...rotasEmpresas,
  ...rotasLojas,
  ...rotasSetores,
  ...rotasUsuarios,
  ...rotasTecnicos,
  ...rotasMaquinas,
  ...rotasPreventivas,
  ...rotasEmpresasTerceirizadas,
  ...rotasSolicitacoes,
  ...rotasOrdensServico,
  ...rotasIndicadores,
  ...rotasNotificacoes,
  ...rotasPush,
]

// Substitui a chamada a fetch() em api.ts quando VITE_USE_MOCKS === 'true'. Recebe o
// corpo já em formato JS puro/FormData — antes do JSON.stringify do lado real — e devolve
// um Response de verdade, para a lógica existente de parsing/erro/401 em api.ts continuar
// funcionando sem duplicação.
export async function simularFetch(
  endpoint: string,
  metodo: MetodoHttp,
  corpo: unknown,
): Promise<Response> {
  const url = new URL(endpoint, 'http://mock.local')

  for (const rota of rotas) {
    if (rota.metodo !== metodo) {
      continue
    }

    const encontrado = rota.padrao.exec(url.pathname)

    if (!encontrado) {
      continue
    }

    try {
      return await rota.tratar({ params: encontrado.slice(1), query: url.searchParams, corpo })
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Erro inesperado no modo mock.'
      return responderErro(mensagem, 500)
    }
  }

  return responderErro(`Rota mock não implementada: ${metodo} ${url.pathname}`, 404)
}
