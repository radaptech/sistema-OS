import { useQuery } from '@tanstack/react-query'
import { servicoPreventivas } from '../servicos/servicoPreventivas'

export function useHistoricoPreventiva(preventivaId: number) {
  return useQuery({
    queryKey: ['preventivas', preventivaId, 'historico'],
    queryFn: () => servicoPreventivas.historico(preventivaId),
  })
}
