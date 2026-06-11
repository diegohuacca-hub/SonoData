// ─── Datos simulados para Fase 2 ─────────────────────────────────────────────
// Cuando llegue la Fase 4 estos se reemplazan por lecturas reales de Firebase

export interface AlumnoMock {
  id: string
  nombre: string
  apellidos: string
  edad: number
  nivelTEA: 1 | 2 | 3
  grupo: string
  avatar: string
}

export interface MetricaLive {
  estadoEmocional: 'tranquilo' | 'ansioso' | 'enfocado' | 'frustrado' | 'saturado' | 'jugueton'
  fc: number           // frecuencia cardíaca bpm
  atencion: number     // 0-100
  actividadMotora: 'baja' | 'moderada' | 'alta'
  conductancia: number // 0-100
  scoresBienestar: number    // 0-100
  scoresAtencion: number     // 0-100
  scoresParticipacion: number // 0-100
  sesionActiva: boolean
  minutosSesion: number
  ultimaActualizacion: Date
}

export interface AlertaMock {
  id: string
  tipo: 'sensor_auditivo' | 'sensor_fc' | 'sensor_movimiento' | 'bitacora_manual'
  severidad: 1 | 2 | 3 | 4 | 5
  titulo: string
  descripcion: string
  timestamp: Date
  resuelta: boolean
}

export interface RegistroBitacoraMock {
  id: string
  tipo: 'incidente' | 'logro' | 'observacion' | 'comunicacion' | 'sensorial' | 'custom'
  severidad: 1 | 2 | 3 | 4 | 5
  titulo: string
  descripcion: string
  duracionMin?: number
  requiereSeguimiento: boolean
  seguimientoResuelto: boolean
  contextos: string[]
  intervenciones: string[]
  areaDesarrollo: string[]
  visibilidad: 'todos' | 'profesional' | 'borrador'
  autorNombre: string
  autorRol: 'docente' | 'terapeuta'
  fecha: Date
  hora: string
}

export interface ActividadTimeline {
  hora: string
  titulo: string
  tipo: 'bienvenida' | 'estructurada' | 'sensorial' | 'comunicacion' | 'libre' | 'activa'
  duracionMin: number
  completada: boolean
}

// ─── Alumno de prueba ─────────────────────────────────────────────────────────
export const ALUMNO_MOCK: AlumnoMock = {
  id: 'alumno_001',
  nombre: 'Mateo',
  apellidos: 'Alvarado',
  edad: 6,
  nivelTEA: 1,
  grupo: 'Grupo Mañana',
  avatar: 'MA',
}

// ─── Métricas live simuladas ──────────────────────────────────────────────────
export const METRICAS_INICIALES: MetricaLive = {
  estadoEmocional: 'tranquilo',
  fc: 82,
  atencion: 74,
  actividadMotora: 'moderada',
  conductancia: 28,
  scoresBienestar: 75,
  scoresAtencion: 82,
  scoresParticipacion: 62,
  sesionActiva: true,
  minutosSesion: 42,
  ultimaActualizacion: new Date(),
}

// ─── Alertas del día ──────────────────────────────────────────────────────────
export const ALERTAS_MOCK: AlertaMock[] = [
  {
    id: 'a1',
    tipo: 'sensor_auditivo',
    severidad: 4,
    titulo: 'Sobrecarga sensorial detectada',
    descripcion: 'Nivel de ruido superó 82 dB durante 8 segundos. YAMNet clasificó: timbre escolar.',
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    resuelta: false,
  },
  {
    id: 'a2',
    tipo: 'bitacora_manual',
    severidad: 3,
    titulo: 'Conducta repetitiva elevada',
    descripcion: 'Terapeuta registró conducta repetitiva sostenida por 3 minutos durante actividad estructurada.',
    timestamp: new Date(Date.now() - 22 * 60 * 1000),
    resuelta: false,
  },
  {
    id: 'a3',
    tipo: 'sensor_fc',
    severidad: 2,
    titulo: 'FC levemente elevada',
    descripcion: 'Frecuencia cardíaca llegó a 98 bpm durante el recreo. Se normalizó en 2 minutos.',
    timestamp: new Date(Date.now() - 35 * 60 * 1000),
    resuelta: true,
  },
]

// ─── Bitácora de ejemplo ──────────────────────────────────────────────────────
export const BITACORA_MOCK: RegistroBitacoraMock[] = [
  {
    id: 'r1',
    tipo: 'incidente',
    severidad: 4,
    titulo: 'Sobrecarga sensorial al timbre',
    descripcion: 'Durante el recreo, Mateo reaccionó con llanto intenso al escuchar el timbre inesperadamente. Duró aproximadamente 4 minutos. Se agitó visiblemente y buscó cubrirse los oídos con ambas manos.',
    duracionMin: 4,
    requiereSeguimiento: true,
    seguimientoResuelto: false,
    contextos: ['Recreo', 'Tránsito entre actividades'],
    intervenciones: ['Rincón de calma', 'Apoyo visual (pictogramas)'],
    areaDesarrollo: ['Regulación emocional'],
    visibilidad: 'todos',
    autorNombre: 'Prof. García',
    autorRol: 'docente',
    fecha: new Date(),
    hora: '10:15',
  },
  {
    id: 'r2',
    tipo: 'logro',
    severidad: 2,
    titulo: 'Primer contacto visual sostenido',
    descripcion: 'Por primera vez esta semana, Mateo mantuvo contacto visual durante más de 10 segundos al recibir una instrucción. Respondió con un "sí" verbal claro y sonrió brevemente.',
    requiereSeguimiento: false,
    seguimientoResuelto: false,
    contextos: ['Hora de clase'],
    intervenciones: ['Refuerzo positivo'],
    areaDesarrollo: ['Lenguaje y comunicación', 'Habilidades sociales'],
    visibilidad: 'todos',
    autorNombre: 'Prof. García',
    autorRol: 'docente',
    fecha: new Date(),
    hora: '08:45',
  },
  {
    id: 'r3',
    tipo: 'observacion',
    severidad: 1,
    titulo: 'Organización espontánea de materiales',
    descripcion: 'Durante la actividad libre, Mateo organizó piezas de construcción por color de forma autónoma durante 15 minutos sin interrupción. Mostró concentración sostenida.',
    duracionMin: 15,
    requiereSeguimiento: false,
    seguimientoResuelto: false,
    contextos: ['Hora de clase', 'Actividad individual'],
    intervenciones: ['Ninguna necesaria'],
    areaDesarrollo: ['Atención y concentración', 'Motricidad fina'],
    visibilidad: 'profesional',
    autorNombre: 'Lic. Méndez',
    autorRol: 'terapeuta',
    fecha: new Date(Date.now() - 24 * 60 * 60 * 1000),
    hora: '10:30',
  },
  {
    id: 'r4',
    tipo: 'sensorial',
    severidad: 3,
    titulo: 'Resistencia al cambio de actividad',
    descripcion: 'Al transitar de la actividad artística al comedor, mostró resistencia verbal y se negó a guardar los materiales. Necesitó apoyo con pictogramas de secuencia para completar la transición.',
    duracionMin: 6,
    requiereSeguimiento: true,
    seguimientoResuelto: false,
    contextos: ['Tránsito entre actividades', 'Comedor'],
    intervenciones: ['Apoyo visual (pictogramas)', 'Redirección de actividad'],
    areaDesarrollo: ['Conducta adaptativa', 'Regulación emocional'],
    visibilidad: 'todos',
    autorNombre: 'Prof. García',
    autorRol: 'docente',
    fecha: new Date(Date.now() - 24 * 60 * 60 * 1000),
    hora: '11:50',
  },
  {
    id: 'r5',
    tipo: 'comunicacion',
    severidad: 1,
    titulo: 'Iniciativa verbal espontánea',
    descripcion: 'Mateo se acercó a un compañero durante el recreo y dijo "quiero jugar". Primera iniciativa verbal espontánea con un par registrada esta semana.',
    requiereSeguimiento: false,
    seguimientoResuelto: false,
    contextos: ['Recreo', 'Interacción con pares'],
    intervenciones: ['Refuerzo positivo'],
    areaDesarrollo: ['Habilidades sociales', 'Lenguaje y comunicación'],
    visibilidad: 'todos',
    autorNombre: 'Lic. Méndez',
    autorRol: 'terapeuta',
    fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    hora: '09:20',
  },
]

// ─── Timeline del día ─────────────────────────────────────────────────────────
export const TIMELINE_MOCK: ActividadTimeline[] = [
  { hora: '08:00', titulo: 'Llegada y bienvenida',       tipo: 'bienvenida',    duracionMin: 15, completada: true },
  { hora: '08:15', titulo: 'Actividad estructurada',     tipo: 'estructurada',  duracionMin: 30, completada: true },
  { hora: '08:45', titulo: 'Recreo sensorial',           tipo: 'sensorial',     duracionMin: 15, completada: true },
  { hora: '09:00', titulo: 'Ejercicio de comunicación',  tipo: 'comunicacion',  duracionMin: 30, completada: true },
  { hora: '09:30', titulo: 'Actividad libre',            tipo: 'libre',         duracionMin: 20, completada: true },
  { hora: '09:50', titulo: 'Sesión motricidad',          tipo: 'activa',        duracionMin: 30, completada: false },
]

// ─── Helpers de formato ───────────────────────────────────────────────────────
export function fmtHace(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1)  return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  return `Hace ${hrs}h`
}

export function fmtFecha(date: Date): string {
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}
