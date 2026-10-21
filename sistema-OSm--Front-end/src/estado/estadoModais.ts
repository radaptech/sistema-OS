import { create } from 'zustand'

export type NomeModal = 'manutencaoPreventiva'

interface EstadoModais {
  modalAtivo: NomeModal | null
  abrirModal: (modal: NomeModal) => void
  fecharModal: () => void
}

export const useEstadoModais = create<EstadoModais>((set) => ({
  modalAtivo: null,
  abrirModal: (modal) => set({ modalAtivo: modal }),
  fecharModal: () => set({ modalAtivo: null }),
}))
