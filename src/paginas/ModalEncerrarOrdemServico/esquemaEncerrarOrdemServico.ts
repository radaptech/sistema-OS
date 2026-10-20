import { z } from 'zod'
import { esquemaItensCusto } from '../../componentes/esquemaCustoOS'
import { tiposDefeito } from '../../tipos/ordemServico'

export const esquemaEncerrarOrdemServico = z.object({
  // Classificação da OS: quem executou o serviço é quem sabe dizer se foi Predial ou
  // Corretiva — o Solicitante não escolhe isso ao abrir o pedido.
  tipoDefeito: z.enum(tiposDefeito, 'Selecione o tipo de OS.'),
  defeitoConstatado: z
    .string()
    .min(10, 'Descreva o defeito constatado.')
    .max(500, 'A descrição deve ter no máximo 500 caracteres.'),
  causaRaiz: z
    .string()
    .min(10, 'Descreva a causa raiz identificada.')
    .max(500, 'A descrição deve ter no máximo 500 caracteres.'),
  solucao: z
    .string()
    .min(10, 'Descreva a solução aplicada.')
    .max(500, 'A descrição deve ter no máximo 500 caracteres.'),
  // Lista, e não dois campos: uma OS pode ter trocado o rolamento E a fita, e somar
  // as duas de cabeça antes de digitar era o que o Técnico fazia até aqui. O servidor
  // soma e grava os totais; nenhum total sai daqui.
  itens: esquemaItensCusto,
  // Quem executou é quem sabe se houve compra com nota (peça, material, fatura da
  // empresa) ou se foi só mão de obra. É esta resposta que decide se o Administrador
  // verá os campos de Número/Série em Custos Pendentes — sem ela, "não gera nota" e
  // "nota ainda não preenchida" seriam a mesma coisa na tela dele.
  temNotaFiscal: z.boolean(),
})

export type DadosEncerrarOrdemServico = z.infer<
  typeof esquemaEncerrarOrdemServico
>
