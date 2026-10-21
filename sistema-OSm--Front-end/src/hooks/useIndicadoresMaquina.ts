import { useQuery } from '@tanstack/react-query'
import { servicoIndicadores } from '../servicos/servicoIndicadores'

export function useIndicadoresMaquina(maquinaId: number | undefined) {
  return useQuery({
    queryKey: ['indicadores-maquina', maquinaId],
    queryFn: () => servicoIndicadores.obterPorMaquina(maquinaId as number),
    enabled: Boolean(maquinaId),
  })
}
