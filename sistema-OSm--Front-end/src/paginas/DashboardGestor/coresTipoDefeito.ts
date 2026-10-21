import type { TipoDefeito } from '../../tipos/ordemServico'

// Paleta categórica validada (skill dataviz) — cor fixa por identidade do tipo de OS,
// nunca por posição/rank, para permanecer estável quando algum tipo não aparece na
// máquina selecionada.
export const CORES_TIPO_DEFEITO: Record<TipoDefeito, string> = {
  Predial: '#2a78d6',
  Corretiva: '#eb6834',
}
