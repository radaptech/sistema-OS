// Navegação por níveis (Loja → Setor → ...) dos painéis do Gestor e do Técnico: em vez
// de filtro, o usuário clica e "entra" em cada nível. Os níveis moram na URL junto com a
// aba (?aba=&loja=&setor=&maquina=&preventiva=), não em useState: cada clique é um push
// no histórico, então o voltar do navegador e o F5 se comportam como numa página de
// verdade.

export const PARAMETROS_NAVEGACAO = ['loja', 'setor', 'maquina', 'preventiva'] as const

export type NivelNavegacao = Partial<Record<(typeof PARAMETROS_NAVEGACAO)[number], number>>

export interface ItemNavegacao {
  id: number
  nome: string
  quantidade: number
  // Quantos itens pedem atenção (preventiva vencida, solicitação que afeta produção) —
  // vira o selo colorido do card.
  destaques: number
  // Quantos itens distintos o próximo nível vai listar ao entrar (setores de uma loja,
  // máquinas de um setor). Ausente no último nível.
  filhos?: number
}

interface OpcoesItensNavegacao<T> {
  obterIdFilho?: (item: T) => number
  ehDestaque?: (item: T) => boolean
}

// Um card por id distinto, com quantos itens carrega, em ordem alfabética. Os cards saem
// dos próprios itens já recortados pelo servidor, então nenhum leva a um nível vazio.
export function montarItensNavegacao<T>(
  itens: T[],
  obterId: (item: T) => number,
  obterNome: (item: T) => string,
  { obterIdFilho, ehDestaque }: OpcoesItensNavegacao<T> = {},
): ItemNavegacao[] {
  const grupos = new Map<number, ItemNavegacao & { idsFilhos: Set<number> }>()
  for (const item of itens) {
    const id = obterId(item)
    let grupo = grupos.get(id)
    if (!grupo) {
      grupo = { id, nome: obterNome(item), quantidade: 0, destaques: 0, idsFilhos: new Set() }
      grupos.set(id, grupo)
    }
    grupo.quantidade += 1
    if (ehDestaque?.(item)) {
      grupo.destaques += 1
    }
    if (obterIdFilho) {
      grupo.idsFilhos.add(obterIdFilho(item))
    }
  }
  return [...grupos.values()]
    .map(({ idsFilhos, ...grupo }) =>
      obterIdFilho ? { ...grupo, filhos: idsFilhos.size } : grupo,
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

// Lê o id de um nível na URL e acha o card dele. Id que não casa com nada (link antigo,
// item que saiu da lista) devolve undefined e a tela cai para o nível de cima em vez de
// abrir vazia.
export function acharNivel<T extends { id: number }>(
  itens: T[],
  valor: string | null,
): T | undefined {
  const id = Number(valor)
  return valor && Number.isInteger(id) ? itens.find((item) => item.id === id) : undefined
}
