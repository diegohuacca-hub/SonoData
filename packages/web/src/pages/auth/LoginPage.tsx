import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../services/firebase'
import { useAuthStore } from '../../store/auth.store'
import clsx from 'clsx'

export default function LoginPage() {
  const navigate  = useNavigate()
  const { usuario, iniciarEscucha } = useAuthStore()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
  if (usuario) navigate(`/${usuario.rol}`, { replace: true })
}, [usuario, navigate])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)

      // Verificar que el perfil existe y está activo
      const snap = await getDoc(doc(db, 'usuarios', cred.user.uid))
      if (!snap.exists()) {
        setError('Perfil de usuario no encontrado. Contacta al administrador.')
        await auth.signOut()
        return
      }

      const perfil = snap.data()
      if (!perfil.activo) {
        setError('Tu cuenta está desactivada. Contacta al administrador.')
        await auth.signOut()
        return
      }

      // El useEffect de arriba redirigirá automáticamente
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/invalid-credential':    'Email o contraseña incorrectos.',
        'auth/user-not-found':        'No existe una cuenta con ese email.',
        'auth/wrong-password':        'Contraseña incorrecta.',
        'auth/too-many-requests':     'Demasiados intentos. Espera unos minutos.',
        'auth/network-request-failed':'Sin conexión a internet.',
      }
      setError(msg[err.code] ?? 'Error al iniciar sesión. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-tea-soft rounded-2xl mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="10" stroke="#1D9E75" strokeWidth="2"/>
              <circle cx="14" cy="14" r="5"  fill="#1D9E75"/>
              <circle cx="14" cy="6"  r="2"  fill="#1D9E75" opacity=".4"/>
              <circle cx="22" cy="14" r="2"  fill="#1D9E75" opacity=".4"/>
              <circle cx="14" cy="22" r="2"  fill="#1D9E75" opacity=".4"/>
              <circle cx="6"  cy="14" r="2"  fill="#1D9E75" opacity=".4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">SensoryTEA</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de monitoreo TEA</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="card flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-tea-green focus:ring-1 focus:ring-tea-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-tea-green focus:ring-1 focus:ring-tea-green"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className={clsx(
              'w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all',
              cargando
                ? 'bg-tea-green/60 cursor-not-allowed'
                : 'bg-tea-green hover:bg-tea-teal active:scale-[.98]'
            )}
          >
            {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Roles disponibles — ayuda visual para el piloto */}
        <div className="mt-6 p-4 bg-white border border-gray-200 rounded-xl">
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
            Acceso por rol
          </p>
          <div className="flex flex-col gap-2">
            {[
              { rol:'Padre / Madre',  color:'bg-emerald-100 text-emerald-800', desc:'Datos completos del hijo' },
              { rol:'Terapeuta',      color:'bg-purple-100 text-purple-800',   desc:'Sesiones asignadas' },
              { rol:'Docente',        color:'bg-amber-100 text-amber-800',     desc:'Actividades escolares' },
            ].map((r) => (
              <div key={r.rol} className="flex items-center gap-2.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.color}`}>
                  {r.rol}
                </span>
                <span className="text-xs text-gray-400">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          ¿Primera vez? El administrador de tu institución enviará la invitación.
        </p>
      </div>
    </div>
  )
}
