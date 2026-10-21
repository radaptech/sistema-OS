// Lista e não só o tipo: o PainelGestor lê a aba da URL (?aba=) e precisa validar o
// texto que veio de lá antes de confiar nele.
export const ABAS_PAINEL_GESTOR = [
  'solicitacoes',
  'os-em-andamento',
  'os-finalizadas',
  'manutencao-preventiva',
] as const

export type AbaPainelGestor = (typeof ABAS_PAINEL_GESTOR)[number]
