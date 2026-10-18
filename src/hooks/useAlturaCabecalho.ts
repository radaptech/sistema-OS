import { useLayoutEffect, useRef } from 'react'

// Publica a altura do cabeçalho em --altura-cabecalho, que o index.css usa para o toast
// nascer logo abaixo dele. ⚠️ O toast cobria o cabeçalho inteiro (sino, tema e Sair) por
// 4s depois de cada ação. A altura não é fixa -- 65px a 97px, conforme a largura e o
// tamanho do nome, que quebra em duas linhas no celular --, por isso é medida.
export function useAlturaCabecalho<T extends HTMLElement>() {
  const referencia = useRef<T>(null)

  useLayoutEffect(() => {
    const cabecalho = referencia.current
    if (!cabecalho) {
      return
    }
    const raiz = document.documentElement
    const observador = new ResizeObserver(() => {
      raiz.style.setProperty('--altura-cabecalho', `${cabecalho.offsetHeight}px`)
    })
    observador.observe(cabecalho)
    return () => {
      observador.disconnect()
      // Tela sem cabeçalho (login): o toast volta para o topo.
      raiz.style.removeProperty('--altura-cabecalho')
    }
  }, [])

  return referencia
}
