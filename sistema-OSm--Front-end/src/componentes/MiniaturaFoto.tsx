import type { LucideIcon } from 'lucide-react'
import { ImagemProgressiva } from './ImagemProgressiva'

interface MiniaturaFotoProps {
  fotoUrl?: string
  alt: string
  // Ícone do selo verde quando não há foto cadastrada (Store, Tag, Building2...).
  Icone: LucideIcon
  // Tamanho e cantos (ex.: 'h-10 w-10 rounded-lg'): o mesmo para a foto e para o selo,
  // assim a linha não muda de altura quando a foto chega ou falta.
  className?: string
  tamanhoIcone?: number
}

// Foto de cadastro (loja, setor, empresa terceirizada) em miniatura, com o selo do ícone
// no lugar quando o registro ainda não tem foto.
export function MiniaturaFoto({
  fotoUrl,
  alt,
  Icone,
  className = 'h-10 w-10 rounded-lg',
  tamanhoIcone = 16,
}: MiniaturaFotoProps) {
  if (fotoUrl) {
    return <ImagemProgressiva src={fotoUrl} alt={alt} className={`shrink-0 object-cover ${className}`} />
  }

  return (
    <span
      className={`bg-marca-600 flex shrink-0 items-center justify-center text-white ${className}`}
    >
      <Icone size={tamanhoIcone} />
    </span>
  )
}
