// ─── Roles del sistema ────────────────────────────────────────────────────────
export type Rol = 'padre' | 'terapeuta' | 'docente' | 'admin';

// ─── Nivel TEA ────────────────────────────────────────────────────────────────
export type NivelTEA = 1 | 2 | 3;

// ─── Institución ──────────────────────────────────────────────────────────────
export interface Institucion {
  id: string;
  nombre: string;
  ruc: string;
  direccion: string;
  adminUid: string;
  creadoEn: Date;
  activo: boolean;
}

// ─── Alumno ───────────────────────────────────────────────────────────────────
export interface Alumno {
  id: string;
  instId: string;
  familiaId: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: Date;
  nivelTEA: NivelTEA;
  sensibilidades: SensibilidadBase[];
  medicacionActiva?: string;
  umbrales: UmbralesAlumno;
  tutoresUids: string[];
  terapeutasUids: string[];
  docentesUids: string[];
  consentimientoFirmado: boolean;
  consentimientoFecha?: Date;
  creadoEn: Date;
  activo: boolean;
}

export interface SensibilidadBase {
  canal: CanalSensorial;
  nivel: 'bajo' | 'medio' | 'alto';
  notas?: string;
}

export interface UmbralesAlumno {
  db_auditivo: number;
  fc_estres: number;
  conductancia_piel: number;
  movimiento_repetitivo_seg: number;
}

// ─── Sesión terapéutica ───────────────────────────────────────────────────────
export interface Sesion {
  id: string;
  alumnoId: string;
  familiaId: string;
  terapeutaUid: string;
  fechaInicio: Date;
  fechaFin?: Date;
  activa: boolean;
  hitos: HitoSesion[];
  protocolosActivados: ProtocoloCalma[];
  readOnly: boolean;
}

export interface HitoSesion {
  timestamp: Date;
  tipo: 'logro' | 'crisis' | 'cambio_actividad' | 'inicio' | 'fin';
  nota?: string;
}

export type ProtocoloCalma =
  | 'rincon_calma'
  | 'pictogramas'
  | 'tiempo_fuera'
  | 'apoyo_fisico'
  | 'refuerzo_positivo';

// ─── Bitácora ─────────────────────────────────────────────────────────────────
export type TipoRegistro = 'incidente' | 'logro' | 'observacion' | 'comunicacion' | 'sensorial' | 'custom';
export type VisibilidadRegistro = 'todos' | 'profesional' | 'borrador';
export type Severidad = 1 | 2 | 3 | 4 | 5;

export interface RegistroBitacora {
  id: string;
  alumnoId: string;
  familiaId: string;
  tipo: TipoRegistro;
  tipoCustomLabel?: string;
  severidad: Severidad;
  titulo: string;
  descripcion: string;
  duracionMin?: number;
  requiereSeguimiento: boolean;
  seguimientoResuelto?: boolean;
  contextos: ContextoRegistro[];
  intervenciones: IntervencionRegistro[];
  areaDesarrollo: AreaDesarrollo[];
  visibilidad: VisibilidadRegistro;
  autorUid: string;
  autorRol: Rol;
  autorNombre: string;
  fecha: Date;
  inmutable: boolean;
}

export type ContextoRegistro =
  | 'recreo' | 'hora_clase' | 'transicion' | 'comedor'
  | 'llegada' | 'salida' | 'actividad_grupal' | 'actividad_individual'
  | 'interaccion_pares' | 'interaccion_adulto';

export type IntervencionRegistro =
  | 'rincon_calma' | 'pictogramas' | 'redireccion' | 'contacto_terapeuta'
  | 'apoyo_fisico' | 'tiempo_fuera' | 'refuerzo_positivo' | 'ninguna';

export type AreaDesarrollo =
  | 'lenguaje_comunicacion' | 'habilidades_sociales' | 'regulacion_emocional'
  | 'motricidad_fina' | 'motricidad_gruesa' | 'atencion_concentracion'
  | 'conducta_adaptativa' | 'autonomia';

// ─── Mapa sensorial ───────────────────────────────────────────────────────────
export type CanalSensorial =
  | 'auditivo' | 'tactil' | 'visual'
  | 'olfativo' | 'vestibular' | 'propioceptivo';

export interface EstimuloSensorial {
  id: string;
  alumnoId: string;
  familiaId: string;
  nombre: string;
  canal: CanalSensorial;
  impacto: number;
  frecuencia: number;
  tiempoRecuperacion: number;
  scorePrioridad: number;
  reacciones: string[];
  estrategias: string[];
  notas?: string;
  fuenteManual: boolean;
  ocurrenciasAutodetectadas: number;
  ultimaActualizacion: Date;
}

// ─── Alertas ──────────────────────────────────────────────────────────────────
export type TipoAlerta =
  | 'sensor_auditivo' | 'sensor_fc'
  | 'sensor_movimiento' | 'sensor_conductancia'
  | 'bitacora_manual';

export interface Alerta {
  id: string;
  alumnoId: string;
  familiaId: string;
  tipo: TipoAlerta;
  severidad: Severidad;
  titulo: string;
  descripcion: string;
  timestamp: Date;
  resuelta: boolean;
  pushEnviado: boolean;
  datos?: Record<string, unknown>;
}

// ─── Sensores ─────────────────────────────────────────────────────────────────
export type TipoSensor =
  | 'fc_bpm' | 'conductancia_us' | 'movimiento_ms2'
  | 'audio_db' | 'audio_clase' | 'emocion_facial';

export interface LecturaSensor {
  alumnoId: string;
  familiaId: string;
  timestamp: number;
  source: 'yamnet' | 'wearable_ble' | 'camara_ia' | 'manual';
  tipo: TipoSensor;
  valor: number;
  unidad: string;
  confianza?: number;
  clasificacion?: string;
}

// ─── Reportes ─────────────────────────────────────────────────────────────────
export interface Reporte {
  id: string;
  alumnoId: string;
  familiaId: string;
  tipo: 'semanal' | 'mensual' | 'terapeutico' | 'escolar' | 'sensorial';
  periodo: { inicio: Date; fin: Date };
  generadoEn: Date;
  generadoPor: 'automatico' | string;
  storageUrl: string;
  urlExpira: Date;
  destinatario: Rol[];
}

// ─── Audit log ────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  uid: string;
  rol: Rol;
  alumnoId: string;
  familiaId: string;
  accion: string;
  timestamp: Date;
  ip?: string;
  dispositivo?: string;
}
