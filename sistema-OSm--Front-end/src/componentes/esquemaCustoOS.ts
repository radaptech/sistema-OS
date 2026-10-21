import { z } from 'zod'

// As duas telas que escrevem custo — encerramento (Técnico) e custos pendentes
// (Administrador) — validam as mesmas duas listas com as mesmas regras. Elas moram aqui
// para não divergirem: uma regra corrigida em um formulário e esquecida no outro deixaria
// o Administrador levar 400 do servidor num payload que a tela dele aceitou.

// Uma TAREFA: o que foi feito, com a peça e a mão de obra dela. `nonnegative` e não
// `positive` porque 0 é valor de negócio legítimo (peça em garantia, serviço sem
// material) — o mesmo motivo de o binding do back ser `gte=0` e nunca `required`.
//
// `custoHoraTecnico` é opcional: a tarefa pode ser só peça. É a mão de obra da tarefa —
// do Técnico, ou da empresa em terceiros. Vale em todo tipo de OS (migration 000017).
export const esquemaItemCusto = z.object({
  descricao: z
    .string()
    .trim()
    .min(1, 'Descreva o serviço feito.')
    .max(120, 'A descrição deve ter no máximo 120 caracteres.'),
  custoManutencao: z
    .number('Informe o custo de manutenção.')
    .nonnegative('O custo não pode ser negativo.')
    .max(999999, 'Informe um valor de até R$ 999.999.'),
  custoHoraTecnico: z
    .number()
    .nonnegative('O custo não pode ser negativo.')
    .max(999999, 'Informe um valor de até R$ 999.999.')
    .optional(),
})

// ⚠️ NÃO existe "maquinário exige hora técnica". A regra existia quando o custo era um
// campo escalar obrigatório e, com uma linha por tarefa, ela obrigava o Técnico a inventar
// uma tarefa só para carregar a mão de obra numa OS que trocou duas peças e não cobrou
// hora nenhuma. Sem hora lançada o servidor grava zero, que diz a mesma coisa sem mentir
// sobre o que foi feito.
export const esquemaItensCusto = z
  .array(esquemaItemCusto)
  .min(1, 'Lance ao menos um custo.')

// Série fica sem `min`: nota de consumidor costuma não ter série, e o servidor converte a
// string vazia em ausência. O número, esse sim, é o que identifica o documento.
export const esquemaNotaFiscal = z.object({
  numero: z
    .string()
    .trim()
    .min(1, 'Informe o número da nota.')
    .max(60, 'O número deve ter no máximo 60 caracteres.'),
  serie: z.string().trim().max(20, 'A série deve ter no máximo 20 caracteres.'),
})
