import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { servicoPush } from '../servicos/servicoPush'
import {
  desinscreverNoNavegador,
  inscreverNoNavegador,
  navegadorSuportaPush,
  obterInscricaoAtual,
  precisaInstalarParaPush,
} from '../utilitarios/pushNavegador'

export const CHAVE_CONFIGURACAO_PUSH = ['push-chave-publica'] as const

// O que a tela mostra sobre o push NESTE aparelho:
// - indisponivel: navegador sem push, ou servidor sem VAPID -- não mostra nada
// - instalar:     iPhone fora do app instalado -- passo a passo da Tela de Início
// - bloqueado:    o usuário negou a permissão -- só ele desfaz, nas configurações
// - desativado:   pode ativar (botão)
// - ativado:      este aparelho recebe os avisos de quem está logado
export type EstadoPush =
  | 'carregando'
  | 'indisponivel'
  | 'instalar'
  | 'bloqueado'
  | 'desativado'
  | 'ativado'

// A chave pública só muda se o VAPID do servidor for trocado -- uma busca por sessão.
export function useConfiguracaoPush(habilitado = true) {
  return useQuery({
    queryKey: CHAVE_CONFIGURACAO_PUSH,
    queryFn: servicoPush.obterChavePublica,
    enabled: habilitado,
    staleTime: Infinity,
  })
}

export function usePush() {
  const precisaInstalar = precisaInstalarParaPush()
  const suportado = navegadorSuportaPush()
  // No iPhone fora do app a chave também é buscada: servidor sem push não deve
  // mandar ninguém instalar o app por causa dele.
  const { data: configuracao, isPending } = useConfiguracaoPush(
    suportado || precisaInstalar,
  )
  const chavePublica = configuracao?.chavePublica ?? null

  const [inscrito, setInscrito] = useState<boolean | null>(null)
  const [permissao, setPermissao] = useState<NotificationPermission | null>(
    suportado ? Notification.permission : null,
  )
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    if (!suportado || precisaInstalar) {
      return
    }
    let ativo = true
    obterInscricaoAtual().then((inscricao) => {
      if (ativo) setInscrito(inscricao !== null)
    })
    return () => {
      ativo = false
    }
  }, [suportado, precisaInstalar])

  // Navegador recusou ou o usuário fechou o pedido: a permissão diz qual dos dois.
  const ativar = useCallback(async () => {
    if (!chavePublica) {
      return
    }
    setProcessando(true)
    try {
      const inscricao = await inscreverNoNavegador(chavePublica)
      setPermissao(Notification.permission)
      if (inscricao) {
        await servicoPush.inscrever(inscricao)
        setInscrito(true)
      }
    } catch {
      // O toast de erro da API já apareceu; erro do navegador no subscribe (serviço de
      // push fora do ar, perfil restrito) cai aqui sem ter o que mostrar além do estado.
      setInscrito((await obterInscricaoAtual()) !== null)
    } finally {
      setProcessando(false)
    }
  }, [chavePublica])

  // Primeiro tira do navegador -- assim, mesmo se o servidor não responder, este
  // aparelho para de mostrar avisos (a linha órfã some no primeiro 410 do envio).
  const desativar = useCallback(async () => {
    setProcessando(true)
    try {
      const endpoint = await desinscreverNoNavegador()
      setInscrito(false)
      if (endpoint) {
        await servicoPush.remover(endpoint)
      }
    } catch {
      // Idem ao ativar: o toast da API já explicou.
    } finally {
      setProcessando(false)
    }
  }, [])

  let estado: EstadoPush
  if (!suportado && !precisaInstalar) {
    estado = 'indisponivel'
  } else if (isPending) {
    estado = 'carregando'
  } else if (!chavePublica) {
    estado = 'indisponivel'
  } else if (precisaInstalar) {
    estado = 'instalar'
  } else if (inscrito === null) {
    estado = 'carregando'
  } else if (permissao === 'denied') {
    estado = 'bloqueado'
  } else if (permissao === 'granted' && inscrito) {
    estado = 'ativado'
  } else {
    estado = 'desativado'
  }

  return { estado, processando, ativar, desativar }
}
