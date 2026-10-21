import type { EscopoAcessoGestor } from '../tipos/autenticacao'
import type { Loja } from '../tipos/loja'
import type { SetorCadastrado } from '../tipos/setor'

// Setor é um cadastro por loja: a comparação é sempre por id, nunca por nome — dois
// setores homônimos em lojas diferentes são registros distintos.
interface ItemComEscopo {
  lojaId: number
  setorId: number
}

export function gestorTemAcesso(
  escopos: EscopoAcessoGestor[],
  lojaId: number,
  setorId: number,
): boolean {
  return escopos.some((escopo) => {
    if (escopo.lojaId !== lojaId) {
      return false
    }

    return escopo.setoresIds === 'todos' || escopo.setoresIds.includes(setorId)
  })
}

export function filtrarPorAcessoGestor<T extends ItemComEscopo>(
  itens: T[],
  escopos: EscopoAcessoGestor[],
): T[] {
  return itens.filter((item) => gestorTemAcesso(escopos, item.lojaId, item.setorId))
}

export function obterLojasIdsPermitidas(escopos: EscopoAcessoGestor[]): number[] {
  return [...new Set(escopos.map((escopo) => escopo.lojaId))]
}

export interface SubgrupoAcessoGestor<T> {
  setorId: number | null
  setorNome: string | null
  itens: T[]
}

export interface GrupoAcessoGestorPorLoja<T> {
  loja: Loja
  subgrupos: SubgrupoAcessoGestor<T>[]
}

// setorId/setorNome nulos no subgrupo representam escopo 'todos' (loja inteira, sem
// divisão por setor). A lista de setores é usada só para resolver o nome exibido no
// cabeçalho do subgrupo — inclusive quando ele está vazio, caso em que não há item de
// onde tirar o nome. Mesmo papel da lista de lojas.
export function agruparPorEscopoGestor<T extends ItemComEscopo>(
  itens: T[],
  escopos: EscopoAcessoGestor[],
  lojas: Loja[],
  setores: SetorCadastrado[],
): GrupoAcessoGestorPorLoja<T>[] {
  return escopos.flatMap((escopo) => {
    const loja = lojas.find((candidata) => candidata.id === escopo.lojaId)

    if (!loja) {
      return []
    }

    const itensDaLoja = itens.filter((item) => item.lojaId === escopo.lojaId)

    const subgrupos: SubgrupoAcessoGestor<T>[] =
      escopo.setoresIds === 'todos'
        ? [{ setorId: null, setorNome: null, itens: itensDaLoja }]
        : escopo.setoresIds.map((setorId) => ({
            setorId,
            setorNome:
              setores.find((setor) => setor.id === setorId)?.nome ?? `Setor ${setorId}`,
            itens: itensDaLoja.filter((item) => item.setorId === setorId),
          }))

    return [{ loja, subgrupos }]
  })
}
