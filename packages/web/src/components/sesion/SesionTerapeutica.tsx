import { useState, useEffect, useRef } from 'react'
import { Card, SectionLabel, BtnPrimary, BtnGhost } from '../ui/Common'
import { PROTOCOLOS_CONFIG, type SesionActiva, type TipoHito, type TipoProtocolo, type Hito, getMetricasSimuladas, ALUMNO_DEMO } from '../../store/demo.data'
import { useSensoresLive } from '../../hooks/useSensoresLive'

const HITO_CONFIG: Record<TipoHito, { label: string; emoji: string; color: string; bg: string }> = {
  logro:            { label:'Logro',             emoji:'⭐', color:'#1D9E75', bg:'#E1F5EE' },
  crisis:           { label:'Crisis',            emoji:'🔴', color:'#E24B4A', bg:'#FCEBEB' },
  cambio_actividad: { label:'Cambio actividad',  emoji:'🔄', color:'#378ADD', bg:'#E6F1FB' },
  protocolo:        { label:'Protocolo activado',emoji:'🛡️', color:'#7F77DD', bg:'#EEEDFE' },
}

function formatDuracion(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

export default function SesionTerapeutica() {
  const [sesion, setSesion]               = useState<SesionActiva | null>(null)
  const [duracion, setDuracion]           = useState(0)
  const [modalHito, setModalHito]         = useState(false)
  const [tipoHito, setTipoHito]           = useState<TipoHito>('logro')
  const [notaHito, setNotaHito]           = useState('')
  const [confirmCerrar, setConfirmCerrar] = useState(false)
  const [sesionesHistorial, setSesionesHistorial] = useState<SesionActiva[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sensores = useSensoresLive('familia_001', 'alumno_001')

  useEffect(() => {
    if (sesion?.estado === 'activa') {
      timerRef.current = setInterval(() => setDuracion(Date.now() - sesion.inicio.getTime()), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [sesion])

  function iniciarSesion() {
    setSesion({ id: Date.now().toString(), inicio: new Date(), estado: 'activa', hitos: [], protocolos: [] })
    setDuracion(0)
  }

  function cerrarSesion() {
    if (!sesion) return
    setSesionesHistorial(h => [{ ...sesion, fin: new Date(), estado: 'cerrada' }, ...h])
    setSesion(null)
    setConfirmCerrar(false)
  }

  function agregarHito() {
    if (!sesion || !notaHito.trim()) return
    const hito: Hito = { id: Date.now().toString(), tipo: tipoHito, nota: notaHito.trim(), timestamp: new Date() }
    setSesion(s => s ? { ...s, hitos: [...s.hitos, hito] } : s)
    setNotaHito('')
    setModalHito(false)
  }

  function activarProtocolo(tipo: TipoProtocolo) {
    if (!sesion) return
    setSesion(s => s ? {
      ...s,
      protocolos: [...s.protocolos, { tipo, timestamp: new Date() }],
      hitos: [...s.hitos, { id: Date.now().toString(), tipo: 'protocolo', nota: `Protocolo: ${PROTOCOLOS_CONFIG[tipo].label}`, timestamp: new Date() }],
    } : s)
  }

  // ── SIN SESIÓN ACTIVA ──────────────────────────────────────────────────────
  if (!sesion) {
    return (
      <div className="flex flex-col gap-4">

        {/* Botón iniciar */}
        <Card className="text-center py-8">
          <div className="text-4xl mb-4">🧑‍⚕️</div>
          <div className="font-semibold text-gray-900 text-lg mb-2">Sin sesión activa</div>
          <div className="text-sm text-gray-400 mb-6 max-w-sm mx-auto leading-relaxed">
            Inicia una sesión para registrar hitos, activar protocolos de calma
            y monitorear al alumno en tiempo real.
          </div>
          <BtnPrimary onClick={iniciarSesion} className="mx-auto">
            Iniciar sesión terapéutica
          </BtnPrimary>
        </Card>

        {/* Guía de primeros pasos */}
        {sesionesHistorial.length === 0 && (
          <Card>
            <SectionLabel>¿Qué puedo hacer durante una sesión?</SectionLabel>
            <div className="flex flex-col gap-3">
              {[
                { emoji:'⭐', titulo:'Marcar hitos', desc:'Registra logros, crisis o cambios de actividad con un solo toque. Quedan documentados con marca de tiempo.' },
                { emoji:'🛡️', titulo:'Activar protocolos de calma', desc:'Rincón de calma, pictogramas, tiempo fuera — se registran automáticamente en la bitácora.' },
                { emoji:'📊', titulo:'Ver sensores en tiempo real', desc:'Con el gateway activo, ves la FC, nivel de atención y estado emocional del alumno durante la sesión.' },
                { emoji:'🔒', titulo:'Cierre con inmutabilidad', desc:'Al cerrar la sesión, todos los datos quedan guardados y no pueden modificarse — garantía de integridad clínica.' },
              ].map(item => (
                <div key={item.titulo} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-xl flex-shrink-0 mt-0.5">{item.emoji}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-0.5">{item.titulo}</div>
                    <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Historial de sesiones */}
        {sesionesHistorial.length > 0 && (
          <div>
            <SectionLabel>Sesiones anteriores</SectionLabel>
            {sesionesHistorial.map(s => (
              <Card key={s.id} className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900">
                    {s.inicio.toLocaleDateString('es-PE', { weekday:'short', day:'numeric', month:'short' })}
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {s.fin ? formatDuracion(s.fin.getTime() - s.inicio.getTime()) : '—'}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{s.hitos.length} hitos</span>
                  <span>{s.protocolos.length} protocolos</span>
                  <span>{s.hitos.filter(h => h.tipo === 'logro').length} logros</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
          En la <span className="font-medium">Fase 4</span> los sensores físicos (Mi Band, micrófono, cámara) se conectan aquí y los datos aparecen en tiempo real automáticamente.
        </div>
      </div>
    )
  }

  // ── SESIÓN ACTIVA ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* Header sesión activa */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="font-semibold text-emerald-900">Sesión activa</div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Iniciada a las {sesion.inicio.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })} · {formatDuracion(duracion)}
              </div>
            </div>
          </div>
          <button onClick={() => setConfirmCerrar(true)}
            className="text-xs font-medium text-red-600 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Modal confirmar cierre */}
      {confirmCerrar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-lg font-semibold text-gray-900 mb-2">¿Cerrar la sesión?</div>
            <div className="text-sm text-gray-500 mb-6">
              Al cerrar, todos los datos quedarán guardados y la sesión se volverá inmutable.
              Llevas {formatDuracion(duracion)} con {sesion.hitos.length} hitos registrados.
            </div>
            <div className="flex gap-3">
              <BtnGhost onClick={() => setConfirmCerrar(false)} className="flex-1">Cancelar</BtnGhost>
              <BtnPrimary onClick={cerrarSesion} className="flex-1">Confirmar cierre</BtnPrimary>
            </div>
          </div>
        </div>
      )}

      {/* Sensores */}
      <div>
        <SectionLabel>Sensores en tiempo real</SectionLabel>
        {sensores.conectado ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:'FC',         valor:`${sensores.fc_bpm}`,      unidad:'bpm', color:'#378ADD', alerta:sensores.fc_bpm > 100 },
              { label:'Atención',   valor:`${sensores.atencion}`,    unidad:'%',   color:'#1D9E75', alerta:sensores.atencion < 40 },
              { label:'Movimiento', valor:`${sensores.movimiento}`,  unidad:'%',   color:'#7F77DD', alerta:sensores.movimiento > 80 },
              { label:'Estrés',     valor:`${sensores.nivelEstres}`, unidad:'%',   color:'#EF9F27', alerta:sensores.nivelEstres > 60 },
            ].map(m => (
              <div key={m.label} className={`bg-white border rounded-xl p-3 shadow-sm ${m.alerta ? 'border-orange-300 bg-orange-50' : 'border-gray-100'}`}>
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">{m.label}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold" style={{ color: m.alerta ? '#D85A30' : m.color }}>{m.valor}</span>
                  <span className="text-xs text-gray-400">{m.unidad}</span>
                </div>
                {m.alerta && <div className="text-[10px] text-orange-600 font-medium mt-1">⚠ Fuera de rango</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400">
            Gateway desconectado — los sensores no están activos durante esta sesión.
          </div>
        )}
      </div>

      {/* Protocolos */}
      <div>
        <SectionLabel>Protocolos de calma</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.entries(PROTOCOLOS_CONFIG) as [TipoProtocolo, typeof PROTOCOLOS_CONFIG[TipoProtocolo]][]).map(([tipo, cfg]) => {
            const activaciones = sesion.protocolos.filter(p => p.tipo === tipo).length
            return (
              <button key={tipo} onClick={() => activarProtocolo(tipo)}
                className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-sm active:scale-[.98]"
                style={{ borderColor: activaciones > 0 ? cfg.color : '#F3F4F6', background: activaciones > 0 ? cfg.bg : 'white' }}>
                <span className="text-2xl">{cfg.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{cfg.label}</div>
                  <div className="text-[11px] text-gray-400 truncate">{cfg.desc}</div>
                </div>
                {activaciones > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: cfg.color, color: 'white' }}>
                    {activaciones}×
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Hitos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Hitos de la sesión</SectionLabel>
          <button onClick={() => setModalHito(true)}
            className="text-xs font-medium text-[#1D9E75] border border-[#1D9E75] px-3 py-1 rounded-full hover:bg-emerald-50 transition-colors">
            + Marcar hito
          </button>
        </div>

        {sesion.hitos.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl">
            Sin hitos registrados aún. Toca un protocolo o marca un hito manualmente.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...sesion.hitos].reverse().map(hito => {
              const cfg = HITO_CONFIG[hito.tipo]
              return (
                <div key={hito.id} className="flex items-start gap-3 p-3 rounded-xl border"
                  style={{ borderColor: cfg.color + '40', background: cfg.bg }}>
                  <span className="text-lg flex-shrink-0 mt-0.5">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[10px] text-gray-400">
                        {hito.timestamp.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">{hito.nota}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal hito */}
      {modalHito && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <div className="text-base font-semibold text-gray-900 mb-4">Marcar hito</div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(Object.entries(HITO_CONFIG) as [TipoHito, typeof HITO_CONFIG[TipoHito]][]).map(([tipo, cfg]) => (
                <button key={tipo} onClick={() => setTipoHito(tipo)}
                  className="flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all"
                  style={tipoHito === tipo ? { background:cfg.bg, borderColor:cfg.color, borderWidth:1.5 } : { borderColor:'#F3F4F6' }}>
                  <span>{cfg.emoji}</span>
                  <span className="text-xs font-medium text-gray-700">{cfg.label}</span>
                </button>
              ))}
            </div>
            <textarea value={notaHito} onChange={e => setNotaHito(e.target.value)}
              placeholder="Describe brevemente lo que ocurrió..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#1D9E75] resize-none mb-4" />
            <div className="flex gap-2">
              <BtnGhost onClick={() => { setModalHito(false); setNotaHito('') }} className="flex-1">Cancelar</BtnGhost>
              <BtnPrimary onClick={agregarHito} disabled={!notaHito.trim()} className="flex-1">Guardar hito</BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
