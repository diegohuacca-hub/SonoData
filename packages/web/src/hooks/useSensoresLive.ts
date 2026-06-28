import { useState, useEffect } from 'react'
import { ref, onValue, off } from 'firebase/database'
import { rtdb } from '../services/firebase'

export interface MetricasSensor {
  fc_bpm:               number
  audio_db:             number
  audio_clase:          string | null
  movimiento:           number
  emocion_facial:       string
  nivelEstres:          number
  atencion:             number
  sesionActiva:         boolean
  minutosSesion:        number
  ultimaLectura:        Date | null
  conectado:            boolean
  wearable_fc:          number
  wearable_hrv:         number
  wearable_nivelEstres: number
  wearable_conectado:   boolean
}

const METRICAS_DEFAULT: MetricasSensor = {
  fc_bpm:               0,
  audio_db:             0,
  audio_clase:          null,
  movimiento:           0,
  emocion_facial:       'neutral',
  nivelEstres:          0,
  atencion:             0,
  sesionActiva:         false,
  minutosSesion:        0,
  ultimaLectura:        null,
  conectado:            false,
  wearable_fc:          0,
  wearable_hrv:         0,
  wearable_nivelEstres: 0,
  wearable_conectado:   false,
}

function calcularEstres(fc: number, movimiento: number): number {
  const fc_base = 72
  const fc_norm = Math.max(0, Math.min(100, ((fc - fc_base) / (150 - fc_base)) * 100))
  return Math.round((fc_norm * 0.6) + (movimiento * 0.4))
}

function calcularAtencion(emocion: string, audio_db: number): number {
  const base: Record<string, number> = {
    'tranquilo': 85, 'neutral': 80, 'enfocado': 95,
    'ansioso': 50,   'frustrado': 40, 'saturado': 20, 'alegria': 90,
  }
  const base_score = base[emocion] ?? 70
  const penalizacion = audio_db > 75 ? Math.min(30, (audio_db - 75) * 2) : 0
  return Math.max(0, Math.min(100, Math.round(base_score - penalizacion)))
}

export function useSensoresLive(familiaId: string, alumnoId: string) {
  const [metricas, setMetricas] = useState<MetricasSensor>(METRICAS_DEFAULT)

  useEffect(() => {
    if (!familiaId || !alumnoId) return

    const basePath = `sensores_live/${familiaId}/${alumnoId}`
    const dbRef    = ref(rtdb, basePath)

    const unsub = onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) return

      // Datos del gateway Python
      const fc          = data.fc_bpm?.valor           ?? data.wearable?.fc ?? METRICAS_DEFAULT.fc_bpm
      const audio_db    = data.audio_db?.valor          ?? METRICAS_DEFAULT.audio_db
      const movimiento = Math.round(data.movimiento?.valor ?? data.wearable?.movimiento ?? METRICAS_DEFAULT.movimiento)
      const emocion     = data.emocion_facial?.emocion  ?? METRICAS_DEFAULT.emocion_facial
      const audio_clase = data.audio_clase?.clasificacion ?? null

      // Datos del Galaxy Watch 8
      const wearable_fc          = data.wearable?.fc          ?? 0
      const wearable_hrv         = data.wearable?.hrv         ?? 0
      const wearable_nivelEstres = data.wearable?.nivelEstres ?? 0
      const wearable_timestamp   = data.wearable?.timestamp   ?? 0
      const wearable_conectado   = wearable_timestamp > 0
        ? (Date.now() - wearable_timestamp) < 30000
        : false

      // Verificar si el gateway está activo
      const heartbeat  = data.gateway_heartbeat?.valor ?? 0
      const tieneAudio = data.audio_db?.timestamp != null
      const conectado  = tieneAudio || (Date.now() / 1000 - heartbeat) < 60

      setMetricas({
        fc_bpm:               fc,
        audio_db,
        audio_clase,
        movimiento,
        emocion_facial:       emocion,
        nivelEstres:          calcularEstres(fc, movimiento),
        atencion:             calcularAtencion(emocion, audio_db),
        sesionActiva:         conectado,
        minutosSesion:        0,
        ultimaLectura:        new Date(),
        conectado,
        wearable_fc,
        wearable_hrv,
        wearable_nivelEstres,
        wearable_conectado,
      })
    })

    return () => off(dbRef)
  }, [familiaId, alumnoId])

  return metricas
}