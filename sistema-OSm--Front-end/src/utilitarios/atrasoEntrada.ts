// Passo entre um item e o outro na entrada da lista. Curto de propósito: o objetivo é a
// lista "assentar" em cascata, não desfilar item por item.
const PASSO_MS = 28

// A partir daqui o atraso para de crescer. Sem esse teto, o 30º card de uma listagem
// esperaria quase um segundo para aparecer — a animação deixaria de ser acabamento e
// viraria espera.
const MAXIMO_ITENS_ESCALONADOS = 6

// Use junto de `animate-surgir`:
//   <div className="animate-surgir" style={atrasoEntrada(indice)}>
//
// Com `key` estável, o React reaproveita o nó do DOM ao filtrar/paginar, então itens que
// permanecem na lista não re-animam — só os que realmente entraram. É por isso que digitar
// na busca não faz a lista inteira piscar de novo.
export function atrasoEntrada(indice: number): { animationDelay: string } {
  const passos = Math.min(indice, MAXIMO_ITENS_ESCALONADOS)

  return { animationDelay: `${passos * PASSO_MS}ms` }
}
