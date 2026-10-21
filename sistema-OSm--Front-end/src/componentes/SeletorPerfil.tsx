import { ShieldCheck, User, UserCog, Wrench, type LucideIcon } from 'lucide-react'
import type { PerfilLogin } from '../tipos/autenticacao'

interface OpcaoPerfil {
  valor: PerfilLogin
  rotulo: string
  Icone: LucideIcon
}

const OPCOES_PERFIL: OpcaoPerfil[] = [
  { valor: 'solicitante', rotulo: 'Solicitante', Icone: User },
  { valor: 'tecnico', rotulo: 'Técnico', Icone: Wrench },
  { valor: 'gestor', rotulo: 'Gestor', Icone: ShieldCheck },
  { valor: 'administrador', rotulo: 'Admin', Icone: UserCog },
]

interface SeletorPerfilProps {
  perfilSelecionado: PerfilLogin
  aoSelecionar: (perfil: PerfilLogin) => void
}

export function SeletorPerfil({
  perfilSelecionado,
  aoSelecionar,
}: SeletorPerfilProps) {
  // Grade 2x2 fixa (em vez de breakpoint de viewport): este seletor sempre vive dentro
  // de um card estreito (`max-w-md`, na Tela de Login e no CadastrarUsuario), então o
  // espaço disponível não cresce com a tela — uma linha única com 4 abas nunca cabe o
  // texto completo, mesmo em telas grandes.
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200/60 bg-slate-50 p-1">
      {OPCOES_PERFIL.map(({ valor, rotulo, Icone }) => {
        const ativo = perfilSelecionado === valor

        return (
          <button
            key={valor}
            type="button"
            onClick={() => aoSelecionar(valor)}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
              ativo
                ? 'bg-marca-600 font-semibold text-white shadow-sm shadow-marca-600/20'
                : 'font-medium text-marca-500 hover:bg-white/60 hover:text-marca-800'
            }`}
          >
            <Icone size={16} className="shrink-0" />
            <span className="truncate">{rotulo}</span>
          </button>
        )
      })}
    </div>
  )
}
