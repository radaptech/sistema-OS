import { useQuery } from '@tanstack/react-query'
import { servicoIndicadores } from '../servicos/servicoIndicadores'

export function useIndicadoresLoja(lojaId: number | undefined) {
  return useQuery({
    queryKey: ['indicadores-loja', lojaId],
    queryFn: () => servicoIndicadores.obterPorLoja(lojaId as number),
    enabled: Boolean(lojaId),
  })
}
