import { z } from 'zod'

export const esquemaCadastrarLoja = z.object({
  nome: z.string().min(1, 'Informe o nome da loja.').max(60),
})

export type DadosCadastrarLoja = z.infer<typeof esquemaCadastrarLoja>
