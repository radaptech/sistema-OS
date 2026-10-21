import { z } from 'zod'

// O motivo é obrigatório: rejeitar sem explicar devolve o Solicitante ao ponto de partida,
// sem saber o que corrigir — e ele reabre o mesmo pedido com o mesmo defeito.
export const esquemaRejeitarSolicitacao = z.object({
  motivo: z
    .string()
    .min(10, 'Explique o motivo da rejeição com no mínimo 10 caracteres.')
    .max(300, 'O motivo deve ter no máximo 300 caracteres.'),
})

export type DadosRejeitarSolicitacao = z.infer<
  typeof esquemaRejeitarSolicitacao
>
