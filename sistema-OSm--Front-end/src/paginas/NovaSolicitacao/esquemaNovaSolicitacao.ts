import { z } from 'zod'
import { marcadoresImpacto, tiposSolicitacao } from '../../tipos/ordemServico'

// Limites da descrição por tipo: o Pequeno Reparo é um recado curto ("a lâmpada do
// corredor queimou"), enquanto o Maquinário precisa de contexto suficiente para o Gestor
// decidir e o Técnico se preparar antes de ir até a máquina.
export const LIMITES_DESCRICAO = {
  maquinario: { minimo: 20, maximo: 1000 },
  reparo: { minimo: 10, maximo: 500 },
} as const

// O formulário é plano — e não uma z.discriminatedUnion — porque o React Hook Form registra
// os campos antes de o Solicitante escolher o tipo. A obrigatoriedade de cada campo é
// resolvida no superRefine, a partir do tipo selecionado no momento do envio.
// Setor, loja, solicitante e data/hora não são enviados: o servidor deriva da máquina
// selecionada e da sessão autenticada.
export const camposNovaSolicitacao = {
  tipo: z.enum(tiposSolicitacao),
  maquinaId: z.number().int().nonnegative().optional(),
  item: z
    .string()
    .max(100, 'O item deve ter no máximo 100 caracteres.')
    .optional(),
  descricao: z.string(),
  impactos: z.array(z.enum(marcadoresImpacto)),
}

type CamposPorTipo = Pick<
  DadosNovaSolicitacao,
  'tipo' | 'maquinaId' | 'item' | 'descricao'
>

// Exportada para a OS direta do Gestor (esquemaAbrirOSDireta) cobrar as mesmas regras.
export function validarCamposPorTipo(
  dados: CamposPorTipo,
  contexto: z.RefinementCtx,
) {
  if (dados.tipo === 'reparo') {
    if (!dados.item?.trim()) {
      contexto.addIssue({
        code: 'custom',
        path: ['item'],
        message: 'Informe o item que precisa de reparo.',
      })
    }
  } else if (!dados.maquinaId) {
    contexto.addIssue({
      code: 'custom',
      path: ['maquinaId'],
      message: 'Selecione uma máquina.',
    })
  }

  const { minimo, maximo } = LIMITES_DESCRICAO[dados.tipo]

  if (dados.descricao.trim().length < minimo) {
    contexto.addIssue({
      code: 'custom',
      path: ['descricao'],
      message: `Descreva o problema com no mínimo ${minimo} caracteres.`,
    })
  }

  if (dados.descricao.length > maximo) {
    contexto.addIssue({
      code: 'custom',
      path: ['descricao'],
      message: `A descrição deve ter no máximo ${maximo} caracteres.`,
    })
  }
}

export const esquemaNovaSolicitacao = z
  .object(camposNovaSolicitacao)
  .superRefine(validarCamposPorTipo)

export type DadosNovaSolicitacao = z.infer<typeof esquemaNovaSolicitacao>
