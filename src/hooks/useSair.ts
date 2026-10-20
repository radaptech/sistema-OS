import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useEstadoAutenticacao } from '../estado/estadoAutenticacao'
import { servicoAutenticacao } from '../servicos/servicoAutenticacao'
import { servicoPush } from '../servicos/servicoPush'
import { avisarOutrasAbasSessaoMudou } from '../utilitarios/canalSessao'
import {
  definirNumeroNoIcone,
  desinscreverNoNavegador,
  limparNotificacoesExibidas,
} from '../utilitarios/pushNavegador'

// Sair de verdade são três coisas, e faltar qualquer uma quebra o login seguinte:
//
// 1. POST /autenticacao/logout -- só o servidor apaga o cookie HttpOnly. Sem isso a
//    sessão continua válida: o próximo acesso ao /login restaura ela no boot e a
//    RotaPublica joga o usuário direto pro painel, sem nunca mostrar o formulário.
// 2. limpar o cache do react-query -- ['sessao'] tem staleTime: Infinity, então o dado
//    antigo sobrevive ao logout. Com ele em cache e autenticado = false, o PortaoSessao
//    cai na condição (sessao && !autenticado) e trava em "Carregando sessão..." pra
//    sempre, porque o efeito que chama entrar() não roda de novo (a referência de
//    sessao não mudou). Limpar tudo também evita vazar dados do usuário anterior.
// 3. zerar o estado global.
//
// E, antes de tudo, desligar o push deste aparelho (precisa da sessão ainda válida pra
// avisar o servidor): num celular compartilhado, quem pegar depois não pode continuar
// recebendo os avisos de quem saiu -- nem ver os que ficaram na bandeja ou o número no
// ícone. Quem quiser de novo ativa no sininho depois de entrar.
//
// O logout ignora erro de propósito: cookie já expirado responde 401, e isso não pode
// impedir o usuário de sair da tela.
export function useSair() {
  const navegar = useNavigate()
  const clienteQuery = useQueryClient()
  const sair = useEstadoAutenticacao((estado) => estado.sair)

  return async function aoSair() {
    await desligarPushDoAparelho()
    await servicoAutenticacao.sair().catch(() => {})
    // O cookie é do navegador, não da aba: as outras abas também acabaram de sair.
    avisarOutrasAbasSessaoMudou()
    clienteQuery.clear()
    sair()
    navegar('/login', { replace: true })
  }
}

// Sai do navegador primeiro: mesmo se o servidor não responder, o aparelho para de
// receber (a linha que sobrar lá some no primeiro 410 do envio). Nunca segura o logout.
async function desligarPushDoAparelho() {
  try {
    const endpoint = await desinscreverNoNavegador()
    definirNumeroNoIcone(0)
    await limparNotificacoesExibidas()
    if (endpoint) {
      await servicoPush.remover(endpoint)
    }
  } catch {
    // Ver acima: o logout segue de qualquer jeito.
  }
}
