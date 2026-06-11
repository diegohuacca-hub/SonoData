import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../services/firebase'
import { useAuthStore } from '../../store/auth.store'
import Sidebar from '../../components/ui/Sidebar'
import DashboardMetricas from '../../components/dashboard/DashboardMetricas'
import Bitacora from '../../components/bitacora/Bitacora'
import Alertas from '../../components/alertas/Alertas'
import MapaSensorial from '../../components/sensorial/MapaSensorial'
import InformeIA from '../../components/informes/InformeIA' 

const NAV = [
  { id:'dashboard', label:'Dashboard',     icon:'📊' },
  { id:'alertas',   label:'Alertas',       icon:'🔔' },
  { id:'bitacora',  label:'Bitácora',      icon:'📋' },
  { id:'sensorial', label:'Mapa sensorial',icon:'🗺️' },
  { id:'informes',  label:'Informes IA',   icon:'🤖' }, 
]

const TITULOS: Record<string, string> = {
  dashboard: 'Dashboard en tiempo real',
  alertas:   'Alertas del día',
  bitacora:  'Bitácora de Mateo A.',
  sensorial: 'Mapa de sensibilidad sensorial',
  informes:  'Informes generados por IA', // ← agregar esta línea
}

export default function PadreDashboard() {
  const { usuario, setUsuario } = useAuthStore()
  const navigate   = useNavigate()
  const [seccion, setSeccion] = useState('dashboard')
  const alertasPendientes = 0

  async function handleLogout() {
    await signOut(auth)
    setUsuario(null)
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar rol="padre" seccion={seccion} onChange={setSeccion}
        onLogout={handleLogout} navItems={NAV}
        nombreUsuario={`${usuario?.nombre} ${usuario?.apellidos}`}
        alertasPendientes={alertasPendientes} />
      <main className="sm:ml-56 pb-24 sm:pb-0">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900">{TITULOS[seccion]}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' })}
            </p>
          </div>
          {seccion === 'dashboard' && <DashboardMetricas />}
          {seccion === 'alertas'   && <Alertas />}
          {seccion === 'bitacora'  && <Bitacora />}
          {seccion === 'sensorial' && <MapaSensorial />}
          {seccion === 'informes' && <InformeIA />}
        </div>
      </main>
    </div>
  )
}
