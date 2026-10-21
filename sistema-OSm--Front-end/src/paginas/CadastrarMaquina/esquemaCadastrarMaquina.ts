import { z } from 'zod'
import { niveisCriticidade } from '../../tipos/maquina'
import { esquemaManutencaoPreventiva } from '../ModalManutencaoPreventiva/esquemaManutencaoPreventiva'

export const esquemaCadastrarMaquina = z.object({
  numeroPatrimonio: z
    .string()
    .min(1, 'Informe o número do patrimônio.')
    .max(50),
  serie: z.string().min(1, 'Informe a série.').max(50),
  nome: z.string().min(1, 'Informe o nome da máquina.').max(100),
  descricao: z
    .string()
    .max(500, 'A descrição deve ter no máximo 500 caracteres.')
    .optional(),
  marca: z.string().max(60).optional(),
  modelo: z.string().max(60).optional(),
  criticidade: z.enum(niveisCriticidade, 'Selecione a criticidade.'),
  // lojaId fica no formulário só para filtrar os setores disponíveis — não é enviado: o
  // servidor deriva a loja a partir do setor (ver NovaMaquinaPayload).
  lojaId: z.number('Selecione a loja.').int().positive('Selecione a loja.'),
  setorId: z.number('Selecione o setor.').int().positive('Selecione o setor.'),
  preventivas: z
    .array(esquemaManutencaoPreventiva)
    .min(1, 'Cadastre pelo menos uma manutenção preventiva.'),
})

export type DadosCadastrarMaquina = z.infer<typeof esquemaCadastrarMaquina>
