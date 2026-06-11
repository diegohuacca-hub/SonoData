import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp, getDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import type { RegistroBitacora, Comentario } from '../store/demo.data'

const ALUMNO_ID = 'alumno_001'

// ─── Escuchar bitácora en tiempo real ─────────────────────────────────────────
export function escucharBitacora(
  onUpdate: (registros: RegistroBitacora[]) => void
): () => void {
  const ref = collection(db, 'alumnos', ALUMNO_ID, 'bitacora')
  const q   = query(ref, orderBy('fecha', 'desc'))

  return onSnapshot(q, (snap) => {
    const registros = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      fecha: (d.data().fecha as Timestamp)?.toDate() ?? new Date(),
      comentarios: (d.data().comentarios ?? []).map((c: any) => ({
        ...c,
        fecha: c.fecha?.toDate ? c.fecha.toDate() : new Date(c.fecha),
      })),
    })) as RegistroBitacora[]
    onUpdate(registros)
  })
}

// ─── Crear registro ───────────────────────────────────────────────────────────
export async function crearRegistro(
  registro: Omit<RegistroBitacora, 'id' | 'fecha' | 'comentarios'>
): Promise<void> {
  const ref = collection(db, 'alumnos', ALUMNO_ID, 'bitacora')

  const datos: any = {
    ...registro,
    fecha:       serverTimestamp(),
    comentarios: [],
    inmutable:   registro.severidad >= 4,
  }

  Object.keys(datos).forEach(key => {
    if (datos[key] === undefined) delete datos[key]
  })

  await addDoc(ref, datos)

  if (registro.severidad >= 4) {
    const TIPO_LABEL: Record<string, string> = {
      incidente:    'Incidente',
      logro:        'Logro',
      observacion:  'Observación',
      comunicacion: 'Comunicación',
      sensorial:    'Evento sensorial',
      custom:       'Registro personalizado',
      aporte_padre: 'Aporte del padre',
    }
    const alertaRef = collection(db, 'alumnos', ALUMNO_ID, 'alertas_sensor')
    await addDoc(alertaRef, {
      tipo:        'bitacora_manual',
      severidad:   registro.severidad,
      titulo:      `${TIPO_LABEL[registro.tipo] ?? 'Registro'}: ${registro.titulo}`,
      descripcion: `Registrado por ${registro.autorNombre} — ${registro.descripcion.slice(0, 120)}${registro.descripcion.length > 120 ? '...' : ''}`,
      timestamp:   serverTimestamp(),
      resuelta:    false,
      fuente:      'bitacora',
      autorNombre: registro.autorNombre,
      autorRol:    registro.autorRol,
    })
  }
}

// ─── Editar registro ──────────────────────────────────────────────────────────
export async function editarRegistro(
  registroId: string,
  cambios: Partial<Omit<RegistroBitacora, 'id' | 'fecha' | 'comentarios'>>
): Promise<void> {
  const ref = doc(db, 'alumnos', ALUMNO_ID, 'bitacora', registroId)

  const datos: any = {
    ...cambios,
    editadoEn: serverTimestamp(),
  }

  Object.keys(datos).forEach(key => {
    if (datos[key] === undefined) delete datos[key]
  })

  await updateDoc(ref, datos)
}

// ─── Agregar comentario ───────────────────────────────────────────────────────
export async function agregarComentario(
  registroId: string,
  comentario: Omit<Comentario, 'id'>
): Promise<void> {
  const ref = doc(db, 'alumnos', ALUMNO_ID, 'bitacora', registroId)
  const nuevoComentario = {
    ...comentario,
    id:    Date.now().toString(),
    fecha: new Date().toISOString(),
  }

  const snap = await getDoc(ref)
  const comentariosActuales = snap.data()?.comentarios ?? []

  await updateDoc(ref, {
    comentarios: [...comentariosActuales, nuevoComentario],
  })
}

// ─── Marcar registro como eliminado ──────────────────────────────────────────
export async function eliminarRegistro(registroId: string): Promise<void> {
  const ref = doc(db, 'alumnos', ALUMNO_ID, 'bitacora', registroId)
  await updateDoc(ref, { eliminado: true })
}