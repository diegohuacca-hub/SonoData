import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { LecturaSensor, UmbralesAlumno, Severidad } from '@tea/shared/types';

admin.initializeApp();
const db      = admin.firestore();
const rtdb    = admin.database();
const messaging = admin.messaging();

// ─── Procesar lectura de sensor desde el gateway ───────────────────────────────
// El gateway envía los datos a esta función via HTTPS
// NUNCA escribe directamente a Firestore
export const procesarLecturaSensor = functions
  .region('us-central1')
  .https.onCall(async (data: LecturaSensor, context) => {

    // 1. Verificar que la llamada viene del gateway autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Token requerido');
    }

    const { alumnoId, familiaId, tipo, valor, timestamp, source, clasificacion, confianza } = data;

    // 2. Obtener perfil del alumno y sus umbrales
    const alumnoSnap = await db.collection('alumnos').doc(alumnoId).get();
    if (!alumnoSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Alumno no encontrado');
    }

    const umbrales = alumnoSnap.data()!.umbrales as UmbralesAlumno;

    // 3. Escribir en Realtime DB para el dashboard live (baja latencia)
    await rtdb.ref(`sensores_live/${familiaId}/${alumnoId}/${tipo}`).set({
      valor, timestamp, source, clasificacion, confianza,
    });

    // 4. Evaluar umbrales y generar alerta si corresponde
    const alerta = evaluarUmbral(tipo, valor, umbrales, clasificacion);

    if (alerta) {
      await generarAlerta(alumnoId, familiaId, alerta);

      // 5. Actualizar mapa sensorial si hay clasificación de audio
      if (tipo === 'audio_clase' && clasificacion) {
        await actualizarMapaSensorial(alumnoId, familiaId, clasificacion, valor);
      }
    }

    // 6. Correlacionar con datos biométricos (ventana ±5 segundos)
    if (tipo === 'audio_clase' && clasificacion) {
      await correlacionarConBiometricos(alumnoId, familiaId, clasificacion, timestamp);
    }

    // 7. Archivar en Firestore (historial de largo plazo)
    await db.collection('alumnos').doc(alumnoId)
      .collection('sensores').add({
        ...data,
        procesadoEn: admin.firestore.FieldValue.serverTimestamp(),
      });

    return { ok: true };
  });

// ─── Evaluar si una lectura supera los umbrales ────────────────────────────────
function evaluarUmbral(
  tipo: string,
  valor: number,
  umbrales: UmbralesAlumno,
  clasificacion?: string,
): AlertaGenerada | null {

  switch (tipo) {
    case 'audio_db':
      if (valor >= umbrales.db_auditivo) {
        return {
          tipo: 'sensor_auditivo',
          severidad: calcularSeveridad(valor, umbrales.db_auditivo, 110),
          titulo: `Ruido intenso detectado (${Math.round(valor)} dB)`,
          descripcion: clasificacion
            ? `Sonido clasificado como: ${clasificacion}`
            : `Nivel de ruido ambiental por encima del umbral`,
        };
      }
      break;

    case 'fc_bpm':
      if (valor >= umbrales.fc_estres) {
        return {
          tipo: 'sensor_fc',
          severidad: calcularSeveridad(valor, umbrales.fc_estres, 180),
          titulo: `Frecuencia cardíaca elevada (${Math.round(valor)} bpm)`,
          descripcion: 'Posible respuesta de estrés o sobrecarga sensorial',
        };
      }
      break;

    case 'conductancia_us':
      if (valor >= umbrales.conductancia_piel) {
        return {
          tipo: 'sensor_conductancia',
          severidad: calcularSeveridad(valor, umbrales.conductancia_piel, 50),
          titulo: 'Respuesta galvánica elevada',
          descripcion: 'Indicador de activación del sistema nervioso — posible estrés',
        };
      }
      break;
  }

  return null;
}

// ─── Calcular severidad proporcional al umbral ────────────────────────────────
function calcularSeveridad(valor: number, umbral: number, maximo: number): Severidad {
  const exceso = (valor - umbral) / (maximo - umbral);
  if (exceso >= 0.8) return 5;
  if (exceso >= 0.6) return 4;
  if (exceso >= 0.4) return 3;
  if (exceso >= 0.2) return 2;
  return 1;
}

// ─── Generar alerta y enviar push si severidad >= 4 ───────────────────────────
async function generarAlerta(
  alumnoId: string,
  familiaId: string,
  alerta: AlertaGenerada,
): Promise<void> {
  const alertaDoc = await db.collection('alumnos').doc(alumnoId)
    .collection('alertas').add({
      ...alerta,
      alumnoId,
      familiaId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      resuelta: false,
      pushEnviado: false,
    });

  // Push notification solo para severidad 4 y 5
  if (alerta.severidad >= 4) {
    await enviarPushAlPadre(familiaId, alumnoId, alerta, alertaDoc.id);
  }
}

// ─── Enviar push notification al padre ────────────────────────────────────────
async function enviarPushAlPadre(
  familiaId: string,
  alumnoId: string,
  alerta: AlertaGenerada,
  alertaId: string,
): Promise<void> {
  // Obtener tokens FCM de los tutores del alumno
  const alumnoSnap = await db.collection('alumnos').doc(alumnoId).get();
  const tutoresUids: string[] = alumnoSnap.data()?.tutoresUids ?? [];

  for (const uid of tutoresUids) {
    const userSnap = await db.collection('usuarios').doc(uid).get();
    const fcmToken: string | undefined = userSnap.data()?.fcmToken;

    if (!fcmToken) continue;

    await messaging.send({
      token: fcmToken,
      notification: {
        title: alerta.titulo,
        body: alerta.descripcion,
      },
      data: {
        alumnoId,
        alertaId,
        severidad: String(alerta.severidad),
        tipo: alerta.tipo,
      },
      android: { priority: 'high' },
      apns: { payload: { aps: { contentAvailable: true, sound: 'default' } } },
    });

    // Marcar alerta como push enviado
    await db.collection('alumnos').doc(alumnoId)
      .collection('alertas').doc(alertaId)
      .update({ pushEnviado: true });
  }
}

// ─── Actualizar mapa sensorial desde detección de audio ───────────────────────
async function actualizarMapaSensorial(
  alumnoId: string,
  familiaId: string,
  clasificacion: string,
  decibelios: number,
): Promise<void> {
  const mapRef = db.collection('alumnos').doc(alumnoId).collection('mapa_sensorial');

  // Buscar si ya existe un estímulo con ese nombre
  const snap = await mapRef.where('nombre', '==', clasificacion).limit(1).get();

  if (!snap.empty) {
    // Actualizar ocurrencias del estímulo existente
    await snap.docs[0].ref.update({
      ocurrenciasAutodetectadas: admin.firestore.FieldValue.increment(1),
      ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    // Crear nuevo estímulo detectado automáticamente
    await mapRef.add({
      alumnoId,
      familiaId,
      nombre: clasificacion,
      canal: 'auditivo',
      impacto: Math.min(10, Math.round(decibelios / 10)),
      frecuencia: 1,
      tiempoRecuperacion: 3,
      scorePrioridad: 0,
      reacciones: [],
      estrategias: [],
      fuenteManual: false,
      ocurrenciasAutodetectadas: 1,
      ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

// ─── Correlacionar evento auditivo con respuesta biométrica ───────────────────
async function correlacionarConBiometricos(
  alumnoId: string,
  familiaId: string,
  clasificacion: string,
  eventTimestamp: number,
): Promise<void> {
  // Esperar 6 segundos para que llegue la respuesta fisiológica
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Leer FC actual desde Realtime DB
  const fcSnap = await rtdb.ref(`sensores_live/${familiaId}/${alumnoId}/fc_bpm`).get();
  const fcData = fcSnap.val();

  if (!fcData) return;

  const deltaTiempo = Math.abs(fcData.timestamp - eventTimestamp);
  const hayRespuesta = fcData.valor > 90 && deltaTiempo < 8000;

  if (hayRespuesta) {
    // Hay correlación: el audio causó respuesta fisiológica
    // Incrementar el impacto del estímulo en el mapa sensorial
    const mapRef = db.collection('alumnos').doc(alumnoId).collection('mapa_sensorial');
    const snap = await mapRef.where('nombre', '==', clasificacion).limit(1).get();

    if (!snap.empty) {
      const estimulo = snap.docs[0].data();
      const nuevoImpacto = Math.min(10, estimulo.impacto + 0.5);
      const nuevoScore = (nuevoImpacto * 0.6) +
                         (estimulo.frecuencia * 0.25) +
                         (estimulo.tiempoRecuperacion * 0.15);

      await snap.docs[0].ref.update({
        impacto: nuevoImpacto,
        scorePrioridad: Math.round(nuevoScore * 10) / 10,
        ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
}

// ─── Generador automático de reportes semanales ────────────────────────────────
// Se ejecuta todos los domingos a medianoche (hora de Perú)
export const generarReporteSemanal = functions
  .region('us-central1')
  .pubsub.schedule('0 0 * * 0')
  .timeZone('America/Lima')
  .onRun(async () => {
    const alumnosSnap = await db.collection('alumnos').where('activo', '==', true).get();

    for (const alumnoDoc of alumnosSnap.docs) {
      try {
        await generarYGuardarReporte(alumnoDoc.id, alumnoDoc.data().familiaId, 'semanal');
      } catch (e) {
        console.error(`Error generando reporte para ${alumnoDoc.id}:`, e);
      }
    }
  });

async function generarYGuardarReporte(
  alumnoId: string,
  familiaId: string,
  tipo: 'semanal' | 'mensual',
): Promise<void> {
  // Aquí se integraría pdfmake para generar el PDF
  // Por ahora registra el documento en Firestore con estado pendiente
  await db.collection('alumnos').doc(alumnoId).collection('reportes').add({
    alumnoId,
    familiaId,
    tipo,
    estado: 'pendiente_generacion',
    generadoEn: admin.firestore.FieldValue.serverTimestamp(),
    generadoPor: 'automatico',
    destinatario: ['padre'],
  });
}

// ─── Tipos internos ────────────────────────────────────────────────────────────
interface AlertaGenerada {
  tipo: string;
  severidad: Severidad;
  titulo: string;
  descripcion: string;
}
