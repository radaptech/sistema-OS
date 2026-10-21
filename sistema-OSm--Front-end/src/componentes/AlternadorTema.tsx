import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { alternarTema, temaAtual } from '../utilitarios/tema'

interface AlternadorTemaProps {
  /** Só o login troca: lá o botão fica sobre o verde da marca, não sobre a barra clara. */
  classe?: string
}

/** Botão de tema claro/escuro. Mora nos três cabeçalhos do sistema e no login. */
export function AlternadorTema({ classe }: AlternadorTemaProps) {
  const [tema, setTema] = useState(temaAtual)

  return (
    <button
      type="button"
      aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'}
      onClick={() => setTema(alternarTema())}
      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${classe ?? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
    >
      {tema === 'escuro' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
