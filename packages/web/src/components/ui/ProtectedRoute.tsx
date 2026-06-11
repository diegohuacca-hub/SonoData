import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'

interface Props {
  rolRequerido: string
  children: React.ReactNode
}

export default function ProtectedRoute({ rolRequerido, children }: Props) {
  const { usuario, cargando } = useAuthStore()

  if (cargando) return null

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (usuario.rol !== rolRequerido && usuario.rol !== 'admin') {
    return <Navigate to={`/${usuario.rol}`} replace />
  }

  return <>{children}</>
}