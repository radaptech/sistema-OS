import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { servicoPush } from '../servicos/servicoPush'
import type { InscricaoPush } from '../tipos/push'
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
  const [falhaNavegador, setFalhaNavegador] = useState(false)

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

  // Duas falhas diferentes, e nenhuma pode terminar em "Avisos ativos":
  // - o navegador recusou o subscribe (aba anônima do Chrome, serviço de push fora do
  //   ar): não há toast da API, então a tela explica com `falhaNavegador`;
  // - o servidor recusou ou a rede caiu: desfaz a inscrição no navegador também.
  //   ⚠️ Antes o catch olhava só para o navegador, que já estava inscrito, e a tela
  //   dizia "Avisos ativos neste aparelho" sem o servidor ter para onde mandar.
  // Navegador que negou a permissão devolve null: a permissão diz o resto.
  const ativar = useCallback(async () => {
    if (!chavePublica) {
      return
    }
    setProcessando(true)
    setFalhaNavegador(false)
    try {
      let inscricao: InscricaoPush | null
      try {
        inscricao = await inscreverNoNavegador(chavePublica)
      } catch {
        setFalhaNavegador(true)
        return
      } finally {
        setPermissao(Notification.permission)
      }
      if (!inscricao) {
        return
      }
      try {
        await servicoPush.inscrever(inscricao)
      } catch {
        // O toast de erro da API já apareceu.
        await desinscreverNoNavegador().catch(() => {})
        setInscrito(false)
        return
      }
      setInscrito(true)
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

  return { estado, processando, falhaNavegador, ativar, desativar }
}
