import { useState, useEffect } from 'react'
import { Card, SectionLabel, SevBadge, SevDots, tiempoRelativo } from '../ui/Common'
import { escucharAlertas, resolverAlerta, type Alerta } from '../../services/alertas.service'

const TIPO_ALERTA_LABEL: Record<string, string> = {
  sensor_auditivo:   'Sensor auditivo',
  sensor_fc:         'Sensor FC',
  sensor_movimiento: 'Sensor movimiento',
  bitacora_manual:   'Registro manual',
}

const SEV_COLOR: Record<number, string> = {
  1:'border-l-green-400', 2:'border-l-teal-400', 3:'border-l-yellow-400',
  4:'border-l-orange-400', 5:'border-l-red-500',
}

export default function Alertas() {
  const [alertas, setAlertas]   = useState<Alerta[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro]     = useState<'todas'|'pendientes'|'resueltas'>('todas')

  useEffect(() => {
    const unsub = escucharAlertas((data) => {
      setAlertas(data)
      setCargando(false)
    })
    return unsub
  }, [])

  async function handleResolver(id: string) {
    try {
      await resolverAlerta(id)
    } catch (e) {
      console.error('Error resolviendo alerta:', e)
    }
  }

  const filtradas  = alertas.filter(a => filtro==='todas' ? true : filtro==='pendientes' ? !a.resuelta : a.resuelta)
  const pendientes = alertas.filter(a => !a.resuelta).length
  const criticas   = alertas.filter(a => !a.resuelta && a.severidad >= 4).length

  if (cargando) return <div className="text-center py-8 text-sm text-gray-400">Cargando alertas...</div>

  if (alertas.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          {[{label:'Total hoy',valor:'0'},{label:'Pendientes',valor:'0'},{label:'Críticas',valor:'0'}].map(s => (
            <Card key={s.label} className="text-center opacity-50">
              <div className="text-2xl font-semibold text-gray-400">{s.valor}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{s.label}</div>
            </Card>
          ))}
        </div>
        <Card className="text-center py-10">
          <div className="text-4xl mb-4">🔔</div>
          <div className="font-semibold text-gray-900 text-lg mb-2">Sin alertas por ahora</div>
          <div className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
            Las alertas aparecen automáticamente cuando los sensores detectan situaciones que requieren atención.
          </div>
        </Card>
        <Card>
          <SectionLabel>¿Cómo se generan las alertas?</SectionLabel>
          <div className="flex flex-col gap-3">
            {[
              { emoji:'❤️', titulo:'Frecuencia cardíaca elevada', desc:'Cuando la Mi Band detecta FC mayor al umbral configurado.' },
              { emoji:'🔊', titulo:'Sonido crítico detectado', desc:'Cuando YAMNet identifica un timbre, alarma o aspiradora con dB alto.' },
              { emoji:'🏃', titulo:'Conducta repetitiva', desc:'Movimiento rítmico sostenido por más de 30 segundos.' },
              { emoji:'📋', titulo:'Registro manual', desc:'Registro en bitácora con severidad 4 o 5.' },
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
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center"><div className="text-2xl font-semibold text-gray-900">{alertas.length}</div><div className="text-[11px] text-gray-400 mt-0.5">Total hoy</div></Card>
        <Card className="text-center" style={{ background: pendientes > 0 ? '#FFF7ED' : undefined }}><div className="text-2xl font-semibold text-orange-600">{pendientes}</div><div className="text-[11px] text-gray-400 mt-0.5">Pendientes</div></Card>
        <Card className="text-center" style={{ background: criticas > 0 ? '#FEF2F2' : undefined }}><div className="text-2xl font-semibold text-red-600">{criticas}</div><div className="text-[11px] text-gray-400 mt-0.5">Críticas</div></Card>
      </div>

      <div className="flex gap-2">
        {(['todas','pendientes','resueltas'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${filtro===f ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-500 border-gray-200'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtradas.map(alerta => (
          <div key={alerta.id} className={`bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden border-l-4 ${SEV_COLOR[alerta.severidad]}`}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <SevBadge sev={alerta.severidad} />
                  <span className="text-[10px] text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">{TIPO_ALERTA_LABEL[alerta.tipo] ?? alerta.tipo}</span>
                  {alerta.resuelta && <span className="text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">Resuelta</span>}
                </div>
                <span className="text-[11px] text-gray-400">{tiempoRelativo(alerta.timestamp)}</span>
              </div>
              <div className="font-medium text-sm text-gray-900 mb-1">{alerta.titulo}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{alerta.descripcion}</div>
              <div className="flex items-center justify-between mt-3">
                <SevDots sev={alerta.severidad} />
                {!alerta.resuelta && (
                  <button onClick={() => handleResolver(alerta.id)}
                    className="text-xs text-[#1D9E75] font-medium border border-[#1D9E75] px-3 py-1 rounded-full hover:bg-emerald-50 transition-colors">
                    Marcar resuelta
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
