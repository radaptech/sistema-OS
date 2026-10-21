import { create } from 'zustand'
import type { EscopoAcessoGestor, PerfilLogin, SessaoUsuario } from '../tipos/autenticacao'

interface EstadoAutenticacao {
  autenticado: boolean
  usuarioId: number | null
  perfil: PerfilLogin | null
  nomeUsuario: string | null
  lojaId: number | null
  setorId: number | null
  setorNome: string | null
  escoposGestor: EscopoAcessoGestor[] | null
  tecnicoId: number | null
  // Recebe o payload devolvido por /autenticacao/login ou /autenticacao/sessao — o front
  // não deriva escopo de acesso, só guarda o que o servidor mandou.
  entrar: (sessao: SessaoUsuario) => void
  sair: () => void
}

const ESTADO_DESLOGADO = {
  autenticado: false,
  usuarioId: null,
  perfil: null,
  nomeUsuario: null,
  lojaId: null,
  setorId: null,
  setorNome: null,
  escoposGestor: null,
  tecnicoId: null,
} as const

export const useEstadoAutenticacao = create<EstadoAutenticacao>((set) => ({
  ...ESTADO_DESLOGADO,
  entrar: (sessao) =>
    set({
      autenticado: true,
      usuarioId: sessao.id,
      perfil: sessao.perfil,
      nomeUsuario: sessao.nome,
      lojaId: sessao.lojaId,
      setorId: sessao.setorId,
      setorNome: sessao.setorNome,
      escoposGestor: sessao.escoposGestor,
      tecnicoId: sessao.tecnicoId,
    }),
  sair: () => set({ ...ESTADO_DESLOGADO }),
}))
