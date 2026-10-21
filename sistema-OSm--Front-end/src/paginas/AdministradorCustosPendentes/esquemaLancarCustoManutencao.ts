import { z } from 'zod'
import {
  esquemaItensCusto,
  esquemaNotaFiscal,
} from '../../componentes/esquemaCustoOS'

// Toda OS passa pelo Técnico — inclusive a que ele encaminhou para uma empresa externa —
// então os custos já chegam preenchidos do encerramento (item 11 do CLAUDE.md). Aqui o
// Administrador só corrige, tipicamente conferindo cada valor contra a nota fiscal.
export const esquemaLancarCustoManutencao = z.object({
  // A lista inteira, corrigida: é substituição, não patch. O modal abre pré-preenchido
  // com o que o Técnico lançou, então o que volta é o conjunto completo.
  itens: esquemaItensCusto,
  // Declarado pelo Técnico no encerramento, corrigível aqui pelo Administrador: é ele
  // que libera a lista abaixo. Desmarcado, o servidor apaga as notas gravadas.
  temNotaFiscal: z.boolean(),
  // Nota fiscal vale em qualquer tipo de OS: é o documento que embasa o custo lançado —
  // a fatura da empresa em terceiros, a nota da peça em maquinário, a do material em
  // reparo. São VÁRIAS porque duas peças compradas em lojas diferentes geram dois
  // documentos. Lista vazia é legítima: nem toda OS teve compra, e a que teve pode
  // ainda não ter sido conferida.
  notasFiscais: z.array(esquemaNotaFiscal),
  descricaoServicoTerceiro: z
    .string()
    .max(300, 'A descrição deve ter no máximo 300 caracteres.')
    .optional(),
})

export type DadosLancarCustoManutencao = z.infer<
  typeof esquemaLancarCustoManutencao
>
