// Lista e não só o tipo: o PainelTecnico lê a aba da URL (?aba=) e precisa validar o
// texto que veio de lá antes de confiar nele.
export const ABAS_PAINEL_TECNICO = ['em-aberto', 'pendentes-pausadas', 'concluidas'] as const

export type AbaPainelTecnico = (typeof ABAS_PAINEL_TECNICO)[number]
