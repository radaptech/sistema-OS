export type Tema = 'claro' | 'escuro'

/* A preferência é decidida uma vez só, no `index.html`, antes da primeira pintura —
   ler `localStorage` aqui de novo repetiria a regra e abriria espaço pra divergência.
   O atributo no `<html>` é a fonte da verdade; estas funções só leem e viram. */
export function temaAtual(): Tema {
  return document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro'
}

export function alternarTema(): Tema {
  const proximo: Tema = temaAtual() === 'escuro' ? 'claro' : 'escuro'
  document.documentElement.dataset.tema = proximo
  localStorage.setItem('tema', proximo)
  return proximo
}
