import { Navigate, Outlet } from 'react-router-dom'
import { useEstadoAutenticacao } from '../estado/estadoAutenticacao'
import { ROTA_POR_PERFIL } from './rotaPorPerfil'

export function RotaPublica() {
  const autenticado = useEstadoAutenticacao((estado) => estado.autenticado)
  const perfil = useEstadoAutenticacao((estado) => estado.perfil)

  if (!autenticado) {
    return <Outlet />
  }

  return <Navigate to={ROTA_POR_PERFIL[perfil ?? 'solicitante']} replace />
}
