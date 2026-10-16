import type { OrigemSolicitacao } from '../tipos/ordemServico'

// Fundo do card de OS: a de preventiva ganha o âmbar (mesmo tratamento do card de solicitação
// de preventiva, que o Gestor deixou de ver quando ela passou a abrir a OS direto). Substitui
// o `bg-white`, em vez de somar a ele: duas classes de fundo no mesmo elemento deixam a
// vencedora por conta da ordem do CSS gerado.
export function fundoDoCardOS(origem: OrigemSolicitacao): string {
  return origem === 'preventiva' ? 'bg-amber-50/70 ring-1 ring-amber-400/40 ring-inset' : 'bg-white'
}

// Quadradinho com o número da OS.
export function fundoDoNumeroOS(origem: OrigemSolicitacao): string {
  return origem === 'preventiva' ? 'bg-amber-500' : 'bg-marca-600'
}
