import { api } from './api'
import { montarMultipart } from './montarMultipart'
import type { NovaSolicitacaoReparoPayload } from '../tipos/reparo'
import type { SolicitacaoOS } from '../tipos/ordemServico'

export const servicoReparos = {
  // A foto passou a ser obrigatória também no Pequeno Reparo, alinhando a regra aos demais
  // tipos: sem imagem, o Gestor não tem como avaliar o pedido antes de abrir a OS.
  criar: (dados: NovaSolicitacaoReparoPayload, foto: File) =>
    api.post<SolicitacaoOS>(
      '/solicitacoes/reparo',
      montarMultipart(dados, { foto }),
    ),
}
