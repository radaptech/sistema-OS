import { useState } from 'react'

interface ImagemProgressivaProps {
  src: string
  alt: string
  className?: string
  // Prévia local (URL.createObjectURL) já está no navegador: não há espera, e atrasar a
  // exibição só criaria um piscar desnecessário.
  imediata?: boolean
}

// Foto que aparece por transparência em vez de "estalar" na tela quando termina de
// baixar, sobre um fundo cinza que já ocupa o espaço final — assim nada em volta se
// desloca quando a imagem chega.
//
// `loading="lazy"` evita baixar foto de máquina que está longe da área visível numa
// listagem longa; `decoding="async"` tira a decodificação da thread principal, para a
// imagem não travar a rolagem ao entrar em cena.
export function ImagemProgressiva({
  src,
  alt,
  className = '',
  imediata = false,
}: ImagemProgressivaProps) {
  const [carregada, setCarregada] = useState(imediata)

  return (
    <img
      src={src}
      alt={alt}
      loading={imediata ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setCarregada(true)}
      // Erro de carregamento também revela o elemento: melhor mostrar o alt do que
      // deixar um retângulo cinza para sempre.
      onError={() => setCarregada(true)}
      className={`duration-padrao ease-entrada bg-slate-100 transition-opacity ${
        carregada ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    />
  )
}
