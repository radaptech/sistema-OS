import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'perigo'
  // Enquanto a ação está em andamento: troca o conteúdo por um indicador e bloqueia o
  // botão. Sem isso, um clique em "Salvar" numa conexão lenta não devolve sinal nenhum e
  // o usuário clica de novo, mandando a mesma coisa duas vezes.
  carregando?: boolean
  rotuloCarregando?: string
}

// Sólido em vez do gradiente antigo: sobre fundo claro o gradiente escurecia a borda
// esquerda do botão e o peso visual saía torto. A sombra colorida tênue é o que dá o
// relevo agora.
const ESTILOS_VARIANTE = {
  primario:
    'bg-marca-600 text-white shadow-sm shadow-marca-600/20 hover:bg-marca-800',
  secundario:
    'border border-slate-200/60 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
  perigo: 'bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700',
}

export function Botao({
  variante = 'primario',
  carregando = false,
  rotuloCarregando = 'Salvando...',
  className = '',
  children,
  disabled,
  ...props
}: BotaoProps) {
  return (
    <button
      // `active:scale` fica sem transição de propósito: é resposta ao toque, e resposta
      // ao toque tem que ser imediata — animar aqui só atrasaria a sensação do clique.
      className={`flex h-[46px] w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold transition-all duration-rapido ease-entrada active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${ESTILOS_VARIANTE[variante]} ${className}`}
      disabled={disabled || carregando}
      aria-busy={carregando}
      {...props}
    >
      {carregando ? (
        <>
          {/* Único giro em loop do sistema, e só enquanto a ação está pendente — some
              assim que o servidor responde. */}
          <Loader2 size={18} className="animate-spin" />
          {rotuloCarregando}
        </>
      ) : (
        children
      )}
    </button>
  )
}
