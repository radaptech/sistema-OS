import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEstadoAutenticacao } from '../estado/estadoAutenticacao'
import { montarUrlLogin } from '../utilitarios/destinoLogin'
import { ROTA_POR_PERFIL } from './rotaPorPerfil'
import type { PerfilLogin } from '../tipos/autenticacao'

interface RotaProtegidaProps {
  perfis?: PerfilLogin[]
}

export function RotaProtegida({ perfis }: RotaProtegidaProps) {
  const autenticado = useEstadoAutenticacao((estado) => estado.autenticado)
  const perfil = useEstadoAutenticacao((estado) => estado.perfil)
  const local = useLocation()

  // Leva junto para onde a pessoa ia (o link de uma notificação, um F5 depois da sessão
  // vencer): depois de entrar, a TelaLogin volta para lá.
  if (!autenticado) {
    return <Navigate to={montarUrlLogin(local.pathname + local.search)} replace />
  }

  if (perfis && perfil && !perfis.includes(perfil)) {
    return <Navigate to={ROTA_POR_PERFIL[perfil]} replace />
  }

  return <Outlet />
}
