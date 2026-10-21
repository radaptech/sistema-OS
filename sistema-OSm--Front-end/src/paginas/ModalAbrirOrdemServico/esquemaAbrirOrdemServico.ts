import { z } from 'zod'
import { niveisUrgencia } from '../../tipos/ordemServico'

export const esquemaAbrirOrdemServico = z.object({
  urgencia: z.enum(niveisUrgencia, 'Selecione o nível de urgência.'),
  tecnicoId: z
    .number('Selecione o técnico responsável.')
    .int()
    .positive('Selecione o técnico responsável.'),
})

export type DadosAbrirOrdemServico = z.infer<typeof esquemaAbrirOrdemServico>
