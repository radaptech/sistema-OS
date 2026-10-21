import { useQuery } from '@tanstack/react-query'
import { servicoAutenticacao } from '../servicos/servicoAutenticacao'

// Restaura a sessão a partir do cookie HttpOnly no bootstrap do app. Sem isso, recarregar
// a página derrubaria o usuário mesmo com a sessão ainda válida no servidor.
export function useSessao() {
  return useQuery({
    queryKey: ['sessao'],
    queryFn: servicoAutenticacao.obterSessao,
    retry: false,
    staleTime: Infinity,
  })
}
