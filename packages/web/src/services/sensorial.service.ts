import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { EstimuloSensorial } from '../store/demo.data'

const ALUMNO_ID = 'alumno_001'

// ─── Escuchar mapa sensorial en tiempo real ───────────────────────────────────
export function escucharMapaSensorial(
  onUpdate: (estimulos: EstimuloSensorial[]) => void
): () => void {
  const ref = collection(db, 'alumnos', ALUMNO_ID, 'mapa_sensorial')
  const q   = query(ref, orderBy('scorePrioridad', 'desc'))

  return onSnapshot(q, (snap) => {
    const estimulos = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as EstimuloSensorial[]
    onUpdate(estimulos)
  })
}

// ─── Crear estímulo ───────────────────────────────────────────────────────────
export async function crearEstimulo(
  estimulo: Omit<EstimuloSensorial, 'id'>
): Promise<void> {
  const ref = collection(db, 'alumnos', ALUMNO_ID, 'mapa_sensorial')
  await addDoc(ref, {
    ...estimulo,
    creadoEn: serverTimestamp(),
  })
}

// ─── Actualizar estímulo ──────────────────────────────────────────────────────
export async function actualizarEstimulo(
  id: string,
  datos: Partial<EstimuloSensorial>
): Promise<void> {
  const ref = doc(db, 'alumnos', ALUMNO_ID, 'mapa_sensorial', id)
  await updateDoc(ref, { ...datos })
}
