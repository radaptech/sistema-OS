import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { servicoIndicadores } from '../servicos/servicoIndicadores'

// `mes` é "MM/AAAA". keepPreviousData: ao trocar de mês o card segura os números do mês
// anterior até o novo chegar, em vez de piscar o esqueleto a cada clique na seta.
export function useCustosDoMes(mes: string) {
  return useQuery({
    queryKey: ['custos-do-mes', mes],
    queryFn: () => servicoIndicadores.obterCustosDoMes(mes),
    placeholderData: keepPreviousData,
  })
}
