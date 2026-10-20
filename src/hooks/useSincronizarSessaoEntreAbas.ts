import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useEstadoAutenticacao } from '../estado/estadoAutenticacao'
import { servicoAutenticacao } from '../servicos/servicoAutenticacao'
import { ROTA_POR_PERFIL } from '../rotas/rotaPorPerfil'
import { escutarSessaoMudouEmOutraAba } from '../utilitarios/canalSessao'

// Quando outra aba entra ou sai (ver canalSessao.ts), esta aba confere no servidor quem é
// a sessão agora e se alinha: outra pessoa → vai para o painel dela; ninguém → login;
// a mesma pessoa (relogou na outra aba) → não mexe em nada.
export function useSincronizarSessaoEntreAbas() {
  const navegar = useNavigate()
  const clienteQuery = useQueryClient()
  const entrar = useEstadoAutenticacao((estado) => estado.entrar)
  const sair = useEstadoAutenticacao((estado) => estado.sair)

  useEffect(() => {
    return escutarSessaoMudouEmOutraAba(async () => {
      const anterior = useEstadoAutenticacao.getState()
      const sessao = await servicoAutenticacao.obterSessao().catch(() => null)

      if (sessao && anterior.autenticado && sessao.id === anterior.usuarioId) {
        return
      }

      if (!sessao) {
        if (!anterior.autenticado) return

        // Mesmo caminho do useSair: limpar TUDO, inclusive ['sessao'] — com a sessão
        // antiga em cache e autenticado = false o PortaoSessao trava em "Carregando".
        clienteQuery.clear()
        sair()
        navegar('/login', { replace: true })
        toast.info('Você saiu do sistema em outra aba.')
        return
      }

      // Outra pessoa: o cache inteiro é da anterior (listas recortadas pelo escopo
      // dela), então sai tudo. ['sessao'] é regravado em vez de removido — removido, o
      // PortaoSessao buscaria de novo e piscaria a tela de carregamento à toa.
      clienteQuery.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'sessao',
      })
      clienteQuery.setQueryData(['sessao'], sessao)
      entrar(sessao)
      navegar(ROTA_POR_PERFIL[sessao.perfil], { replace: true })
      toast.info(
        `Sessão trocada em outra aba: agora você está como ${sessao.nome}.`,
      )
    })
  }, [clienteQuery, entrar, sair, navegar])
}
