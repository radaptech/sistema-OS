import { useEffect, useId, useRef } from 'react'

// Modais abertos, do mais antigo ao mais novo: o Esc fecha só o de cima. Sem a pilha, o
// modal de confirmação aberto por cima de outro fecharia os dois de uma vez.
const pilha: symbol[] = []

// O que faz um modal ser diálogo para o leitor de tela e para o teclado: role="dialog",
// aria-modal e o título ligado por aria-labelledby (espalhe `propsDialogo` no cartão e
// ponha `idTitulo` no título), mais o Esc fechando. Padrão que nasceu na FolhaMaquinas.
// ⚠️ Os modais não tinham nada disso: o leitor de tela não anunciava a abertura, e no
// desktop o Esc não fazia nada.
//
// `podeFechar: false` enquanto salva: fechar no meio do envio esconderia o erro, que é
// justamente o que o modal precisa mostrar (ver ModalEncerrarOrdemServico).
export function useDialogo(fechar: () => void, { podeFechar = true } = {}) {
  const idTitulo = useId()
  // Ref e não dependência do efeito abaixo: re-rodar aquele efeito a cada mudança tiraria
  // o modal da pilha e o poria de volta no topo, por cima de um que abriu depois dele.
  const permitido = useRef(podeFechar)
  useEffect(() => {
    permitido.current = podeFechar
  }, [podeFechar])

  useEffect(() => {
    const eu = Symbol('dialogo')
    pilha.push(eu)
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && pilha.at(-1) === eu && permitido.current) {
        fechar()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      pilha.splice(pilha.indexOf(eu), 1)
    }
  }, [fechar])

  return {
    idTitulo,
    propsDialogo: {
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': idTitulo,
    } as const,
  }
}
