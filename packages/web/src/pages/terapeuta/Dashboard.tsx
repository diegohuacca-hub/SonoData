import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../services/firebase'
import { useAuthStore } from '../../store/auth.store'
import Sidebar from '../../components/ui/Sidebar'
import Bitacora from '../../components/bitacora/Bitacora'
import Alertas from '../../components/alertas/Alertas'
import SesionTerapeutica from '../../components/sesion/SesionTerapeutica'
import MapaSensorial from '../../components/sensorial/MapaSensorial'
import InformeIA from '../../components/informes/InformeIA' 

const NAV = [
  { id:'sesion',    label:'Sesión activa',   icon:'🧑‍⚕️' },
  { id:'bitacora',  label:'Bitácora',         icon:'📋' },
  { id:'sensorial', label:'Mapa sensorial',   icon:'🗺️' },
  { id:'alertas',   label:'Alertas',          icon:'🔔' },
  { id:'informes',  label:'Informes IA',   icon:'🤖' }, 
]

const TITULOS: Record<string,string> = {
  sesion:    'Sesión terapéutica — Mateo A.',
  bitacora:  'Bitácora — Mateo A.',
  sensorial: 'Mapa de sensibilidad sensorial',
  alertas:   'Alertas del día',
  informes:  'Informes generados por IA', 
}

export default function TerapeutaDashboard() {
  const { usuario, setUsuario } = useAuthStore()
  const navigate = useNavigate()
  const [seccion, setSeccion] = useState('sesion')
  const alertasPendientes = 0

  async function handleLogout() {
    await signOut(auth)
    setUsuario(null)
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar rol="terapeuta" seccion={seccion} onChange={setSeccion}
        onLogout={handleLogout} navItems={NAV}
        nombreUsuario={`${usuario?.nombre} ${usuario?.apellidos}`}
        alertasPendientes={alertasPendientes} />
      <main className="sm:ml-56 pb-24 sm:pb-0">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900">{TITULOS[seccion]}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-gray-400">{new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'})}</span>
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Terapeuta</span>
            </div>
          </div>
          {seccion === 'sesion'    && <SesionTerapeutica />}
          {seccion === 'bitacora'  && <Bitacora />}
          {seccion === 'sensorial' && <MapaSensorial />}
          {seccion === 'alertas'   && <Alertas />}
          {seccion === 'informes' && <InformeIA />}
        </div>
      </main>
    </div>
  )
}
