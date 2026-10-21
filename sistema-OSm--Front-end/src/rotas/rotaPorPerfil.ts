import type { PerfilLogin } from '../tipos/autenticacao'

export const ROTA_POR_PERFIL: Record<PerfilLogin, string> = {
  solicitante: '/home-solicitante',
  tecnico: '/painel-tecnico',
  gestor: '/painel-gestor',
  administrador: '/painel-administrador',
}
