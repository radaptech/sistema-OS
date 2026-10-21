import { useQuery } from '@tanstack/react-query'
import { servicoUsuarios } from '../servicos/servicoUsuarios'
import type { ParametrosListagemUsuarios } from '../servicos/servicoUsuarios'

export function useUsuarios(parametros: ParametrosListagemUsuarios = {}) {
  return useQuery({
    queryKey: ['usuarios', parametros],
    queryFn: () => servicoUsuarios.listar(parametros),
  })
}
