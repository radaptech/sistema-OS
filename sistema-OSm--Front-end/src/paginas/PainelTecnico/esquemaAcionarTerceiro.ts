import { z } from 'zod'

export const esquemaAcionarTerceiro = z.object({
  empresaTerceirizadaId: z
    .number('Selecione a empresa terceirizada.')
    .int()
    .positive('Selecione a empresa terceirizada.'),
})

export type DadosAcionarTerceiro = z.infer<typeof esquemaAcionarTerceiro>
