import { useQuery } from '@tanstack/react-query'
import { servicoPreventivas } from '../servicos/servicoPreventivas'

// `habilitado` deixa o Painel do Gestor buscar só a lista da aba aberta.
export function usePreventivas(maquinaId?: number, habilitado = true) {
  return useQuery({
    queryKey: ['preventivas', { maquinaId }],
    queryFn: () => servicoPreventivas.listar({ maquinaId }),
    enabled: habilitado,
  })
}
