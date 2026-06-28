import { Card, SectionLabel, ProgressRing } from '../ui/Common'
import { useSensoresLive } from '../../hooks/useSensoresLive'
import { useAuthStore } from '../../store/auth.store'

const EMOCIONES = [
  { id:'tranquilo', emoji:'😊', label:'Tranquilo', color:'#1D9E75', bg:'#E1F5EE' },
  { id:'ansioso',   emoji:'😟', label:'Ansioso',   color:'#EF9F27', bg:'#FAEEDA' },
  { id:'enfocado',  emoji:'🧐', label:'Enfocado',  color:'#7F77DD', bg:'#EEEDFE' },
  { id:'frustrado', emoji:'😤', label:'Frustrado', color:'#D85A30', bg:'#FAECE7' },
  { id:'saturado',  emoji:'😵', label:'Saturado',  color:'#E24B4A', bg:'#FCEBEB' },
  { id:'jugueton',  emoji:'🥳', label:'Juguetón',  color:'#378ADD', bg:'#E6F1FB' },
] as const

export default function DashboardMetricas() {
  const { usuario } = useAuthStore()
  const sensores = useSensoresLive('familia_001', 'alumno_001')

  if (!sensores.conectado && !sensores.wearable_conectado) {
    return (
      <div className="flex flex-col gap-4">

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
          <span className="text-sm text-gray-500">Gateway desconectado — los sensores no están activos</span>
        </div>

        <Card className="text-center py-8">
          <div className="text-4xl mb-4">📊</div>
          <div className="font-semibold text-gray-900 text-lg mb-2">
            Sin datos de sensores aún
          </div>
          <div className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
            Cuando el gateway esté activo, aquí verás en tiempo real la frecuencia cardíaca,
            nivel de atención, actividad motora y estado emocional del alumno.
          </div>
        </Card>

        <Card>
          <SectionLabel>¿Por dónde empezar?</SectionLabel>
          <div className="flex flex-col gap-3">
            {usuario?.rol === 'padre' && (
              <>
                <PasoGuia num={1} titulo="Revisa la bitácora" desc="El terapeuta y docente van registrando ahí todo lo que ocurre con tu hijo en el colegio." icono="📋" />
                <PasoGuia num={2} titulo="Agrega tu aporte" desc="En la bitácora puedes agregar notas sobre lo que observas en casa — rutinas, lo que lo calma, logros recientes." icono="✍️" />
                <PasoGuia num={3} titulo="Explora el mapa sensorial" desc="Aquí verás qué estímulos afectan más a tu hijo y cómo manejarlo. El terapeuta lo irá completando." icono="🗺️" />
                <PasoGuia num={4} titulo="Activa los sensores" desc="Cuando tengas el wearable y el micrófono configurados, este dashboard mostrará datos en tiempo real." icono="📡" />
              </>
            )}
            {usuario?.rol === 'terapeuta' && (
              <>
                <PasoGuia num={1} titulo="Inicia una sesión" desc="Ve a 'Sesión activa' para abrir la primera sesión terapéutica con el alumno." icono="🧑‍⚕️" />
                <PasoGuia num={2} titulo="Registra en la bitácora" desc="Documenta incidentes, logros y observaciones desde la pestaña Bitácora." icono="📋" />
                <PasoGuia num={3} titulo="Construye el mapa sensorial" desc="Agrega los estímulos que identifiques durante las sesiones — auditivos, táctiles, visuales." icono="🗺️" />
                <PasoGuia num={4} titulo="Activa los sensores" desc="Configura el gateway para tener datos de FC y audio durante las sesiones." icono="📡" />
              </>
            )}
            {usuario?.rol === 'docente' && (
              <>
                <PasoGuia num={1} titulo="Registra en la bitácora" desc="Documenta lo que observas en el aula — incidentes, logros, comportamientos relevantes." icono="📋" />
                <PasoGuia num={2} titulo="Revisa el mapa sensorial" desc="Conoce qué estímulos del aula afectan más al alumno para anticiparte." icono="🗺️" />
                <PasoGuia num={3} titulo="Responde al padre" desc="Los aportes del padre aparecen en la bitácora — puedes comentarlos y coordinar estrategias." icono="💬" />
              </>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 opacity-40">
          {[
            { label:'Atención',         unidad:'%'   },
            { label:'Frec. cardíaca',   unidad:'bpm' },
            { label:'Actividad motora', unidad:'%'   },
            { label:'Nivel estrés',     unidad:'%'   },
          ].map(m => (
            <Card key={m.label} className="flex flex-col gap-2">
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{m.label}</div>
              <div className="text-2xl font-semibold text-gray-300">—</div>
              <div className="h-1.5 bg-gray-100 rounded-full" />
              <div className="text-[10px] text-gray-300">{m.unidad}</div>
            </Card>
          ))}
        </div>

      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Banner estado conexión */}
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
        <span className="text-sm text-emerald-700 font-medium">
          {sensores.conectado ? 'Gateway conectado' : 'Watch conectado'}
        </span>
        <span className="text-sm text-emerald-500">— datos en tiempo real</span>
      </div>

      {/* Alerta de sonido */}
      {sensores.audio_clase && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-red-500 text-lg">🔊</span>
          <span className="text-sm font-medium text-red-800">Sonido detectado: </span>
          <span className="text-sm text-red-700">{sensores.audio_clase}</span>
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Atención',        valor: sensores.atencion    > 0 ? `${sensores.atencion}%`     : 'Sin datos', sub:'Nivel cognitivo', color:'#1D9E75', pct:sensores.atencion,                       alerta:sensores.atencion > 0 && sensores.atencion < 40 },
          { label:'Frec. cardíaca',  valor: sensores.fc_bpm      > 0 ? `${sensores.fc_bpm} bpm`   : 'Sin datos', sub:'Normal',          color:'#378ADD', pct:Math.min(100,(sensores.fc_bpm/150)*100), alerta:sensores.fc_bpm > 100 },
          { label:'Actividad motora',valor: sensores.movimiento  > 0 ? `${sensores.movimiento}%`  : 'Sin datos', sub:'Moderada',        color:'#7F77DD', pct:sensores.movimiento,                     alerta:sensores.movimiento > 80 },
          { label:'Nivel estrés',    valor: sensores.nivelEstres > 0 ? `${sensores.nivelEstres}%` : 'Sin datos', sub:'Calculado',       color:'#EF9F27', pct:sensores.nivelEstres,                    alerta:sensores.nivelEstres > 60 },
        ].map(m => (
          <Card key={m.label} className={`flex flex-col gap-2 ${m.alerta ? 'border-orange-300 bg-orange-50' : ''}`}>
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{m.label}</div>
            <div className="text-2xl font-semibold" style={{ color: m.alerta ? '#D85A30' : m.valor === 'Sin datos' ? '#D1D5DB' : 'inherit' }}>{m.valor}</div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width:`${m.pct}%`, background: m.alerta ? '#D85A30' : m.color }} />
            </div>
            <div className="text-[10px] text-gray-400">{m.alerta ? '⚠ Fuera de rango' : m.valor === 'Sin datos' ? 'Sensor no conectado' : m.sub}</div>
          </Card>
        ))}
      </div>

      {/* Galaxy Watch 8 */}
      {sensores.wearable_conectado ? (
        <Card>
          <SectionLabel>⌚ Galaxy Watch 8 — Datos fisiológicos</SectionLabel>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="flex flex-col items-center p-3 bg-red-50 rounded-xl border border-red-100">
              <span className="text-2xl mb-1">❤️</span>
              <span className="text-xl font-bold text-red-600">{sensores.wearable_fc}</span>
              <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">BPM</span>
              {sensores.wearable_fc > 100 && (
                <span className="text-[10px] text-orange-500 mt-1">⚠ Elevada</span>
              )}
            </div>
            <div className="flex flex-col items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-2xl mb-1">📊</span>
              <span className="text-xl font-bold text-blue-600">{Math.round(sensores.wearable_hrv)}</span>
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">HRV ms</span>
              {sensores.wearable_hrv < 20 && sensores.wearable_hrv > 0 && (
                <span className="text-[10px] text-orange-500 mt-1">⚠ Bajo</span>
              )}
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl border"
              style={{
                background: sensores.wearable_nivelEstres >= 3 ? '#FEF3C7' : '#F0FDF4',
                borderColor: sensores.wearable_nivelEstres >= 3 ? '#FCD34D' : '#BBF7D0'
              }}>
              <span className="text-2xl mb-1">
                {sensores.wearable_nivelEstres >= 4 ? '😰' : sensores.wearable_nivelEstres >= 2 ? '😟' : '😊'}
              </span>
              <span className="text-xl font-bold"
                style={{ color: sensores.wearable_nivelEstres >= 3 ? '#D97706' : '#16A34A' }}>
                {sensores.wearable_nivelEstres}/5
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: sensores.wearable_nivelEstres >= 3 ? '#D97706' : '#16A34A' }}>
                Estrés
              </span>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="opacity-50">
          <SectionLabel>⌚ Galaxy Watch 8</SectionLabel>
          <div className="flex items-center gap-2 py-2">
            <span className="text-gray-300 text-2xl">⌚</span>
            <span className="text-sm text-gray-400">Watch no conectado — abre la app SonoData en el watch</span>
          </div>
        </Card>
      )}

      {/* Score de sesión + Emoción */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionLabel>Score de sesión</SectionLabel>
          <div className="flex justify-around pt-1">
            <ProgressRing value={sensores.atencion}    color="#1D9E75" label="Bienestar" />
            <ProgressRing value={Math.round(sensores.atencion * 0.8)} color="#7F77DD" label="Participación" />
            <ProgressRing value={sensores.atencion}    color="#378ADD" label="Atención" />
          </div>
        </Card>

        <Card>
          <SectionLabel>Estado emocional — detectado por cámara</SectionLabel>
          {sensores.emocion_facial && sensores.emocion_facial !== 'neutral' ? (
            <>
              <div className="flex flex-col items-center py-4">
                {EMOCIONES.filter(e => e.id === sensores.emocion_facial).map(e => (
                  <div key={e.id} className="flex flex-col items-center gap-2 py-3 px-6 rounded-xl border-2"
                    style={{ background:e.bg, borderColor:e.color }}>
                    <span className="text-4xl">{e.emoji}</span>
                    <span className="text-sm font-semibold" style={{ color:e.color }}>{e.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-1">
                {EMOCIONES.filter(e => e.id !== sensores.emocion_facial).map(e => (
                  <div key={e.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-100">
                    <span className="text-sm opacity-40">{e.emoji}</span>
                    <span className="text-[10px] text-gray-300">{e.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-4 gap-2">
              <span className="text-3xl opacity-30">😶</span>
              <span className="text-xs text-gray-400">
                {sensores.conectado ? 'Apunta la cámara al alumno' : 'Cámara no conectada'}
              </span>
              <div className="flex flex-wrap gap-2 justify-center mt-1">
                {EMOCIONES.map(e => (
                  <div key={e.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-100">
                    <span className="text-sm opacity-30">{e.emoji}</span>
                    <span className="text-[10px] text-gray-300">{e.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

    </div>
  )
}

function PasoGuia({ num, titulo, desc, icono }: { num: number; titulo: string; desc: string; icono: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0 mt-0.5">
        {num}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-base">{icono}</span>
          <span className="text-sm font-medium text-gray-900">{titulo}</span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
