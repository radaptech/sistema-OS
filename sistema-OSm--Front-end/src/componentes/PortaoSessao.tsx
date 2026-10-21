import { useEffect, type ReactNode } from 'react'
import { useSessao } from '../hooks/useSessao'
import { useSincronizarSessaoEntreAbas } from '../hooks/useSincronizarSessaoEntreAbas'
import { useIntegracaoPush } from '../hooks/useIntegracaoPush'
import { useEstadoAutenticacao } from '../estado/estadoAutenticacao'
import { CarregandoSessao } from './CarregandoSessao'

interface PortaoSessaoProps {
  children: ReactNode
}

// Restaura a sessão a partir do cookie HttpOnly antes de renderizar qualquer rota. O
// endpoint responde 401 quando não há sessão — o que não é erro, é só "não logado", e por
// isso useSessao não faz retry.
export function PortaoSessao({ children }: PortaoSessaoProps) {
  const { data: sessao, isPending } = useSessao()
  const entrar = useEstadoAutenticacao((estado) => estado.entrar)
  const autenticado = useEstadoAutenticacao((estado) => estado.autenticado)
  useSincronizarSessaoEntreAbas()
  useIntegracaoPush()

  useEffect(() => {
    if (sessao) {
      entrar(sessao)
    }
  }, [sessao, entrar])

  // Espera também o espelhamento no estado global, e não só a query: entrar() roda
  // num efeito, ou seja, DEPOIS da primeira renderização dos filhos. Sem esta segunda
  // condição, essa primeira renderização acontece com autenticado = false, e a
  // RotaProtegida redireciona antes de o efeito rodar — na prática, todo F5 ou link
  // direto numa rota interna (/cadastrar-setor, /cadastrar-loja/3) devolvia o usuário
  // para a rota inicial do perfil, mesmo com a sessão válida no servidor.
  if (isPending || (sessao && !autenticado)) {
    return <CarregandoSessao />
  }

  return <>{children}</>
}
