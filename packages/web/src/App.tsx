import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/auth.store'

// Páginas de autenticación
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Dashboards por rol
import PadreDashboard from './pages/padre/Dashboard'
import TerapeutaDashboard from './pages/terapeuta/Dashboard'
import DocenteDashboard from './pages/docente/Dashboard'

// Componente de ruta protegida
import ProtectedRoute from './components/ui/ProtectedRoute'

export default function App() {
  const { usuario, cargando, iniciarEscucha } = useAuthStore()

  // 🔥 INICIAR ESCUCHA DE FIREBASE (CLAVE)
  useEffect(() => {
    const unsub = iniciarEscucha()
    return () => unsub()
  }, [])

  // Spinner mientras verifica sesión
  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-tea-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />

        <Route path="/"
          element={usuario ? <Navigate to={`/${usuario.rol}`} replace /> : <Navigate to="/login" replace />}
        />

        <Route path="/padre/*"
          element={<ProtectedRoute rolRequerido="padre"><PadreDashboard /></ProtectedRoute>}
        />
        <Route path="/terapeuta/*"
          element={<ProtectedRoute rolRequerido="terapeuta"><TerapeutaDashboard /></ProtectedRoute>}
        />
        <Route path="/docente/*"
          element={<ProtectedRoute rolRequerido="docente"><DocenteDashboard /></ProtectedRoute>}
        />
        <Route path="/admin/*"
          element={<ProtectedRoute rolRequerido="admin"><PadreDashboard /></ProtectedRoute>}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
