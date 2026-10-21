import { z } from 'zod'

export const esquemaPausarOrdemServico = z.object({
  motivo: z
    .string()
    .min(5, 'Descreva o motivo da pausa.')
    .max(300, 'A descrição deve ter no máximo 300 caracteres.'),
})

export type DadosPausarOrdemServico = z.infer<typeof esquemaPausarOrdemServico>
