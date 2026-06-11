import { useNavigate } from 'react-router-dom'

export default function RegisterPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm card text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Registro de institución</h2>
        <p className="text-sm text-gray-500 mb-6">
          El registro de nuevas instituciones está disponible desde el panel administrativo.
          Contacta al equipo de SensoryTEA para crear tu cuenta.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="text-sm font-medium text-tea-green hover:underline"
        >
          Volver al login
        </button>
      </div>
    </div>
  )
}
