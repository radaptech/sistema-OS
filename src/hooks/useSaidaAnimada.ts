import { useCallback, useEffect, useRef, useState } from 'react'

// Precisa acompanhar a duração de `fade-out`/`pop-out` no tailwind.config.ts. Passou o
// tempo, o componente desmonta — se este valor ficar maior que a animação, o modal fica
// parado e invisível na tela antes de sumir.
const DURACAO_SAIDA_MS = 120

interface SaidaAnimada {
  fechar: () => void
  classeFundo: string
  classeCartao: string
}

// Modais entram animados mas costumam sumir de um quadro para o outro, o que é justamente
// o momento em que o corte é mais perceptível. Este hook segura a desmontagem pelo tempo
// da animação de saída e devolve as classes de cada estado.
//
// A saída é mais curta e mais discreta que a entrada de propósito: quem fechou já está
// olhando para o que vem depois, então prolongar a despedida só atrasa a próxima ação.
//
// `variante: 'folha'` é a folha inferior (bottom sheet) das telas de celular: o cartão
// sobe da borda de baixo em vez de crescer no meio da tela.
export function useSaidaAnimada(
  aoFechar: () => void,
  { variante = 'modal' }: { variante?: 'modal' | 'folha' } = {},
): SaidaAnimada {
  const [fechando, setFechando] = useState(false)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (temporizador.current) {
        clearTimeout(temporizador.current)
      }
    }
  }, [])

  const fechar = useCallback(() => {
    // Cliques repetidos no X não devem empilhar temporizadores.
    if (temporizador.current) {
      return
    }

    setFechando(true)
    temporizador.current = setTimeout(aoFechar, DURACAO_SAIDA_MS)
  }, [aoFechar])

  return {
    fechar,
    classeFundo: fechando ? 'animate-fade-out' : 'animate-fade-in',
    classeCartao:
      variante === 'folha'
        ? fechando
          ? 'animate-folha-sair'
          : 'animate-folha-entrar'
        : fechando
          ? 'animate-pop-out'
          : 'animate-pop-in',
  }
}
