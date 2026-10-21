import { useQuery } from '@tanstack/react-query'
import { servicoSolicitacoes } from '../servicos/servicoSolicitacoes'
import type { ParametrosFilaGestor } from '../servicos/servicoSolicitacoes'

// Fila do Gestor: o servidor já devolve apenas o que está dentro do escopo de Loja/Setor
// do usuário autenticado.
// `habilitado` deixa o Painel do Gestor buscar só a lista da aba aberta.
export function useTodasSolicitacoes(
  parametros: ParametrosFilaGestor = {},
  habilitado = true,
) {
  return useQuery({
    queryKey: ['solicitacoes-os-todas', parametros],
    queryFn: () => servicoSolicitacoes.listarTodas(parametros),
    enabled: habilitado,
  })
}
