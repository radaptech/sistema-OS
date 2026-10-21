import { PackageSearch } from 'lucide-react'
import { ImagemProgressiva } from './ImagemProgressiva'
import type { Maquina } from '../tipos/maquina'

interface PreviaMaquinaProps {
  maquina?: Maquina
}

export function PreviaMaquina({ maquina }: PreviaMaquinaProps) {
  return (
    <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 transition-colors sm:h-48">
      {maquina?.fotoUrl ? (
        <ImagemProgressiva
          src={maquina.fotoUrl}
          alt={maquina.nome}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <PackageSearch size={28} />
          <span className="text-xs">
            {maquina ? 'Sem foto cadastrada' : 'Selecione uma máquina'}
          </span>
        </div>
      )}
    </div>
  )
}
