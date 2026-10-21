import { z } from 'zod'

export const esquemaCadastrarEmpresaTerceirizada = z.object({
  nome: z.string().min(1, 'Informe o nome da empresa.').max(100),
  especialidade: z.string().max(100).optional(),
  telefone: z.string().max(20).optional(),
})

export type DadosCadastrarEmpresaTerceirizada = z.infer<
  typeof esquemaCadastrarEmpresaTerceirizada
>
