// ─── Tipos del sistema ────────────────────────────────────────────────────────
export type TipoRegistro = 'incidente' | 'logro' | 'observacion' | 'comunicacion' | 'sensorial' | 'custom' | 'aporte_padre'
export type Severidad    = 1 | 2 | 3 | 4 | 5
export type Visibilidad  = 'todos' | 'profesional' | 'borrador'
export type Rol          = 'padre' | 'terapeuta' | 'docente' | 'admin'
export type CanalSensorial = 'auditivo' | 'tactil' | 'visual' | 'olfativo' | 'vestibular' | 'propioceptivo'

export type EstadoSesion = 'sin_sesion' | 'activa' | 'cerrada'
export type TipoHito     = 'logro' | 'crisis' | 'cambio_actividad' | 'protocolo'
export type TipoProtocolo = 'rincon_calma' | 'pictogramas' | 'tiempo_fuera' | 'apoyo_fisico' | 'refuerzo_positivo'

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface Comentario {
  id: string
  autorNombre: string
  autorRol: Rol
  texto: string
  fecha: Date
}

export interface RegistroBitacora {
  id: string
  tipo: TipoRegistro
  severidad: Severidad
  titulo: string
  descripcion: string
  duracionMin?: number
  requiereSeguimiento: boolean
  seguimientoResuelto: boolean
  contextos: string[]
  intervenciones: string[]
  areaDesarrollo: string[]
  visibilidad: Visibilidad
  autorNombre: string
  autorRol: Rol
  fecha: Date
  inmutable: boolean
  comentarios?: Comentario[]
}

export interface EstimuloSensorial {
  id: string
  nombre: string
  canal: CanalSensorial
  impacto: number
  frecuencia: number
  recuperacion: number
  scorePrioridad: number
  reacciones: string[]
  estrategias: string[]
  notas: string
  autodetectado: boolean
  ocurrencias: number
}

export interface Hito {
  id: string
  tipo: TipoHito
  nota: string
  timestamp: Date
}

export interface SesionActiva {
  id: string
  inicio: Date
  fin?: Date
  estado: EstadoSesion
  hitos: Hito[]
  protocolos: { tipo: TipoProtocolo; timestamp: Date }[]
}

// ─── Datos vacíos (sin simulaciones) ─────────────────────────────────────────
export const BITACORA_DEMO:  RegistroBitacora[]  = []
export const ESTIMULOS_DEMO: EstimuloSensorial[] = []
export const ALERTAS_DEMO:   any[]               = []

// ─── Alumno activo ────────────────────────────────────────────────────────────
// Este dato vendrá de Firestore en producción
export const ALUMNO_DEMO = {
  id:       'alumno_001',
  nombre:   '',
  apellidos:'',
  edad:     0,
  nivelTEA: 1,
  grupo:    '',
  avatar:   '?',
}

// ─── Configuración de canales sensoriales ────────────────────────────────────
export const CANALES_CONFIG: Record<CanalSensorial, { label: string; emoji: string; color: string; bg: string; tc: string }> = {
  auditivo:      { label:'Auditivo',      emoji:'👂', color:'#E24B4A', bg:'#FCEBEB', tc:'#501313' },
  tactil:        { label:'Táctil',        emoji:'🤚', color:'#D85A30', bg:'#FAECE7', tc:'#4A1B0C' },
  visual:        { label:'Visual',        emoji:'👁️', color:'#7F77DD', bg:'#EEEDFE', tc:'#26215C' },
  olfativo:      { label:'Olfativo',      emoji:'👃', color:'#BA7517', bg:'#FAEEDA', tc:'#412402' },
  vestibular:    { label:'Vestibular',    emoji:'🌀', color:'#378ADD', bg:'#E6F1FB', tc:'#042C53' },
  propioceptivo: { label:'Propioceptivo', emoji:'💪', color:'#1D9E75', bg:'#E1F5EE', tc:'#04342C' },
}

export const REACCIONES_OPTS = [
  'Llanto', 'Gritos', 'Taparse los oídos', 'Huir', 'Conducta repetitiva',
  'Agresión', 'Retiro social', 'Bloqueo', 'Búsqueda de objeto de confort', 'Autolesión leve',
]

export const ESTRATEGIAS_OPTS = [
  'Anticipar / avisar', 'Auriculares de cancelación', 'Reducir exposición',
  'Rincón de calma', 'Objeto de confort', 'Apoyo físico suave',
  'Ruta alternativa', 'Adaptar el entorno', 'Ignorar / habituación gradual',
]

export const PROTOCOLOS_CONFIG: Record<TipoProtocolo, { label: string; emoji: string; color: string; bg: string; desc: string }> = {
  rincon_calma:      { label:'Rincón de calma',       emoji:'🧘', color:'#1D9E75', bg:'#E1F5EE', desc:'Llevar al alumno a un espacio tranquilo y seguro' },
  pictogramas:       { label:'Apoyo visual',           emoji:'🖼️', color:'#378ADD', bg:'#E6F1FB', desc:'Usar pictogramas para comunicar la siguiente actividad' },
  tiempo_fuera:      { label:'Tiempo fuera',           emoji:'⏸️', color:'#7F77DD', bg:'#EEEDFE', desc:'Pausa estructurada de la actividad actual' },
  apoyo_fisico:      { label:'Apoyo físico suave',     emoji:'🤝', color:'#EF9F27', bg:'#FAEEDA', desc:'Contacto suave y predecible para calmar' },
  refuerzo_positivo: { label:'Refuerzo positivo',      emoji:'⭐', color:'#D85A30', bg:'#FAECE7', desc:'Reconocer y celebrar el comportamiento positivo' },
}

// ─── Métricas vacías para el dashboard ───────────────────────────────────────
export function getMetricasSimuladas() {
  return {
    atencion:      0,
    fc_bpm:        0,
    movimiento:    0,
    nivelEstres:   0,
    minutosSesion: 0,
    sesionActiva:  false,
  }
}
