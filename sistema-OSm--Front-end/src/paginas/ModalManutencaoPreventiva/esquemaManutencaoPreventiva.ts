import { z } from 'zod'

export const esquemaManutencaoPreventiva = z.object({
  // Preenchido só nas preventivas que vieram do servidor na edição (ver PreventivaManutencao).
  id: z.number().int().positive().optional(),
  maquinaId: z.number().int().nonnegative(),
  // Obrigatório: ao vencer, a preventiva abre a OS direto no nome deste técnico, sem
  // passar pelo Gestor. O servidor recusa o cadastro sem ele, e também recusa técnico
  // que foi desativado ou trocou de perfil.
  tecnicoId: z
    .number('Selecione o técnico responsável.')
    .int()
    .positive('Selecione o técnico responsável.'),
  descricao: z
    .string()
    .min(3, 'Descreva o procedimento de manutenção.')
    .max(3000, 'A descrição deve ter no máximo 3000 caracteres.'),
  intervaloDias: z
    .number('Informe o intervalo em dias.')
    .int('Informe um número inteiro de dias.')
    .min(1, 'O intervalo deve ser de pelo menos 1 dia.')
    .max(3650, 'Informe um intervalo de até 3650 dias.'),
  // Vem do <input type="date"> em YYYY-MM-DD; o serviço converte para dd/mm/yyyy no envio.
  proximaData: z.string().min(1, 'Informe a próxima data.'),
  ativa: z.boolean(),
})

export type DadosManutencaoPreventiva = z.infer<typeof esquemaManutencaoPreventiva>
