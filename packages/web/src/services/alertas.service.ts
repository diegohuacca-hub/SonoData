import {
  collection, doc, updateDoc, onSnapshot,
  query, orderBy, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const ALUMNO_ID = 'alumno_001'

export interface Alerta {
  id: string
  tipo: string
  severidad: 1 | 2 | 3 | 4 | 5
  titulo: string
  descripcion: string
  timestamp: Date
  resuelta: boolean
}

// ─── Escuchar alertas en tiempo real ──────────────────────────────────────────
export function escucharAlertas(
  onUpdate: (alertas: Alerta[]) => void
): () => void {
  const ref = collection(db, 'alumnos', ALUMNO_ID, 'alertas_sensor')
  const q   = query(ref, orderBy('timestamp', 'desc'))

  return onSnapshot(q, (snap) => {
    const alertas = snap.docs.map(d => {
      const data = d.data()
      return {
        id:          d.id,
        tipo:        data.tipo ?? 'bitacora_manual',
        severidad:   data.severidad ?? 1,
        titulo:      data.titulo ?? '',
        descripcion: data.descripcion ?? '',
        timestamp:   data.timestamp instanceof Timestamp
          ? data.timestamp.toDate()
          : new Date(data.timestamp ?? Date.now()),
        resuelta:    data.resuelta ?? false,
      } as Alerta
    })
    onUpdate(alertas)
  })
}

// ─── Marcar alerta como resuelta ──────────────────────────────────────────────
export async function resolverAlerta(alertaId: string): Promise<void> {
  const ref = doc(db, 'alumnos', ALUMNO_ID, 'alertas_sensor', alertaId)
  await updateDoc(ref, { resuelta: true })
}
