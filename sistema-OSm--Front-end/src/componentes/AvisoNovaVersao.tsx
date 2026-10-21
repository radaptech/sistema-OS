import { RefreshCw } from 'lucide-react'

interface AvisoNovaVersaoProps {
  aoAtualizar: () => void
}

// Conteúdo do toast de "nova versão" (registrarServiceWorker.ts). Toast e não modal:
// não interrompe quem está no meio de um encerramento de OS -- ele atualiza quando
// terminar. Fica aberto até o clique (autoClose desligado em main.tsx).
export function AvisoNovaVersao({ aoAtualizar }: AvisoNovaVersaoProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-slate-800">
        Nova versão disponível
      </p>
      <p className="text-xs text-slate-500">
        Atualize quando terminar o que está fazendo.
      </p>
      <button
        type="button"
        onClick={aoAtualizar}
        className="bg-marca-600 shadow-marca-600/20 flex h-9 items-center justify-center gap-2 self-start rounded-xl px-4 text-sm font-semibold text-white shadow-sm"
      >
        <RefreshCw size={14} />
        Atualizar
      </button>
    </div>
  )
}
