import { z } from 'zod'
import { niveisUrgencia } from '../../tipos/ordemServico'
import {
  camposNovaSolicitacao,
  validarCamposPorTipo,
} from '../NovaSolicitacao/esquemaNovaSolicitacao'

// Os campos da Nova Solicitação (mesmas regras por tipo) + urgência e técnico (os do
// abrir-os) + o setor, que no reparo o Gestor escolhe — o Solicitante não escolhe porque
// tem um setor só. Sem foto: quem abre aqui é quem avaliaria a foto.
//
// Urgência, técnico e setor são cobrados no superRefine, não no objeto base: o Zod pula
// o superRefine quando o objeto base já falhou, e aí os erros de máquina/descrição só
// apareceriam numa segunda tentativa de envio.
export const esquemaAbrirOSDireta = z
  .object({
    ...camposNovaSolicitacao,
    urgencia: z.enum(niveisUrgencia).optional(),
    tecnicoId: z.number(),
    setorId: z.number().int().positive().optional(),
  })
  .superRefine((dados, contexto) => {
    validarCamposPorTipo(dados, contexto)

    if (dados.tipo === 'reparo' && !dados.setorId) {
      contexto.addIssue({
        code: 'custom',
        path: ['setorId'],
        message: 'Selecione o setor.',
      })
    }
    if (!dados.urgencia) {
      contexto.addIssue({
        code: 'custom',
        path: ['urgencia'],
        message: 'Selecione o nível de urgência.',
      })
    }
    if (!(dados.tecnicoId > 0)) {
      contexto.addIssue({
        code: 'custom',
        path: ['tecnicoId'],
        message: 'Selecione o técnico responsável.',
      })
    }
  })

export type DadosAbrirOSDireta = z.infer<typeof esquemaAbrirOSDireta>
