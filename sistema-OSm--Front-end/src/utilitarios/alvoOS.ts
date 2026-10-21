// Solicitação e OS apontam ou para uma máquina cadastrada (maquinário) ou para
// um item digitado na hora (pequeno reparo). Estes helpers centralizam essa escolha, para
// os componentes não repetirem o mesmo encadeamento de fallback.

export interface AlvoOS {
  maquinaNome: string | null
  maquinaCodigo: string | null
  itemDescricao: string | null
}

export function obterNomeAlvo(alvo: AlvoOS): string {
  return alvo.maquinaNome ?? alvo.itemDescricao ?? '—'
}

export function obterCodigoAlvo(alvo: AlvoOS): string {
  return alvo.maquinaCodigo ?? '—'
}

export function combinaBuscaAlvo(alvo: AlvoOS, termoBusca: string): boolean {
  if (!termoBusca) {
    return true
  }

  const termo = termoBusca.trim().toLowerCase()

  return (
    obterNomeAlvo(alvo).toLowerCase().includes(termo) ||
    obterCodigoAlvo(alvo).toLowerCase().includes(termo)
  )
}
