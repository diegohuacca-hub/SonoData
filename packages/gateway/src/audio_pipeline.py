"""
Gateway TEA — Pipeline de reconocimiento de audio con YAMNet
Corre localmente en la tablet Android (via Termux o dispositivo Linux embebido)
El audio NUNCA sale del dispositivo — solo el evento clasificado viaja a Firebase
"""

import numpy as np
import sounddevice as sd
import tensorflow as tf
import tensorflow_hub as hub
import requests
import json
import time
import threading
from datetime import datetime
from queue import Queue

# ─── Configuración ─────────────────────────────────────────────────────────────
SAMPLE_RATE    = 16000   # Hz requerido por YAMNet
CHUNK_DURATION = 1.0     # segundos por chunk analizado
OVERLAP        = 0.5     # solapamiento entre chunks
CONFIANZA_MIN  = 0.70    # umbral mínimo de confianza para reportar
FIREBASE_FUNCTION_URL = "https://us-central1-{TU_PROJECT_ID}.cloudfunctions.net/procesarLecturaSensor"

# ─── Clases relevantes para TEA (índices en AudioSet / YAMNet) ────────────────
CLASES_TEA = {
    0:   "Habla / voz",
    74:  "Campana / timbre",
    75:  "Timbre de puerta",
    80:  "Alarma",
    81:  "Sirena de emergencia",
    132: "Taladro / sierra",
    137: "Aspiradora",
    287: "Llanto de bebé o niño",
    384: "Gritos",
    400: "Música alta",
    430: "Tráfico vehicular",
    500: "Bocina / claxon",
}

# ─── Cargar modelo YAMNet desde TensorFlow Hub ────────────────────────────────
print("[TEA Gateway] Cargando modelo YAMNet...")
modelo_yamnet = hub.load("https://tfhub.dev/google/yamnet/1")
print("[TEA Gateway] Modelo cargado. Iniciando captura de audio...")

# Cola para procesar audio sin bloquear la captura
audio_queue: Queue = Queue(maxsize=10)


# ─── Captura de audio desde micrófono ─────────────────────────────────────────
def capturar_audio():
    """Captura audio en chunks continuos y los encola para procesamiento."""
    chunk_samples = int(SAMPLE_RATE * CHUNK_DURATION)

    def callback(indata, frames, time_info, status):
        if status:
            print(f"[Audio] Status: {status}")
        # Convertir a mono float32 normalizado [-1, 1]
        mono = indata[:, 0].astype(np.float32)
        if not audio_queue.full():
            audio_queue.put(mono.copy())

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        blocksize=chunk_samples,
        dtype=np.float32,
        callback=callback,
    ):
        print("[TEA Gateway] Captura de audio activa. Ctrl+C para detener.")
        threading.Event().wait()


# ─── Calcular nivel de decibelios ─────────────────────────────────────────────
def calcular_db(audio: np.ndarray) -> float:
    rms = np.sqrt(np.mean(np.square(audio)))
    if rms == 0:
        return 0.0
    db = 20 * np.log10(rms + 1e-9) + 94  # referencia SPL aproximada
    return round(float(db), 1)


# ─── Clasificar audio con YAMNet ──────────────────────────────────────────────
def clasificar_audio(audio: np.ndarray) -> tuple[str | None, float, float]:
    """
    Retorna (nombre_clase, confianza, decibelios)
    Retorna (None, 0, db) si no supera el umbral de confianza
    """
    scores, embeddings, spectrogram = modelo_yamnet(audio)
    scores_np = scores.numpy()

    # Promedio de scores sobre todos los frames del chunk
    scores_mean = np.mean(scores_np, axis=0)
    clase_idx = int(np.argmax(scores_mean))
    confianza = float(scores_mean[clase_idx])
    db = calcular_db(audio)

    # Solo reportar si es una clase relevante para TEA y supera confianza mínima
    if clase_idx in CLASES_TEA and confianza >= CONFIANZA_MIN:
        return CLASES_TEA[clase_idx], confianza, db

    # También reportar si el nivel de dB es muy alto (independiente de la clase)
    if db >= 80:
        return f"Ruido_alto_{clase_idx}", confianza, db

    return None, confianza, db


# ─── Enviar evento a Firebase Function ────────────────────────────────────────
def enviar_evento(
    alumno_id: str,
    familia_id: str,
    clasificacion: str,
    confianza: float,
    db_nivel: float,
    gateway_token: str,
) -> bool:
    """
    Envía SOLO el evento clasificado (no el audio) a Firebase.
    El audio se descarta inmediatamente después de la clasificación.
    """
    payload = {
        "alumnoId":      alumno_id,
        "familiaId":     familia_id,
        "timestamp":     int(time.time() * 1000),
        "source":        "yamnet",
        "tipo":          "audio_clase",
        "valor":         db_nivel,
        "unidad":        "dB",
        "confianza":     round(confianza, 3),
        "clasificacion": clasificacion,
    }

    try:
        resp = requests.post(
            FIREBASE_FUNCTION_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {gateway_token}",
                "Content-Type":  "application/json",
            },
            timeout=5,
        )
        return resp.status_code == 200
    except requests.exceptions.RequestException as e:
        print(f"[Firebase] Error enviando evento: {e}")
        return False


# ─── Hilo de procesamiento principal ─────────────────────────────────────────
def procesar_audio(alumno_id: str, familia_id: str, gateway_token: str):
    """Consume la cola de audio y clasifica cada chunk."""
    print(f"[TEA Gateway] Procesando audio para alumno: {alumno_id}")

    while True:
        audio_chunk = audio_queue.get()

        clasificacion, confianza, db_nivel = clasificar_audio(audio_chunk)

        if clasificacion:
            hora = datetime.now().strftime("%H:%M:%S")
            print(f"[{hora}] Detectado: {clasificacion} | "
                  f"Confianza: {confianza:.0%} | {db_nivel} dB")

            enviado = enviar_evento(
                alumno_id, familia_id, clasificacion,
                confianza, db_nivel, gateway_token,
            )
            if not enviado:
                print("[Firebase] Evento en cola local (sin conexión)")
                # TODO: implementar cola local para modo offline

        audio_queue.task_done()


# ─── Punto de entrada ─────────────────────────────────────────────────────────
def iniciar_gateway(alumno_id: str, familia_id: str, gateway_token: str):
    """
    Inicia el gateway con dos hilos paralelos:
    1. Captura continua de audio
    2. Procesamiento y clasificación con YAMNet
    """
    hilo_procesamiento = threading.Thread(
        target=procesar_audio,
        args=(alumno_id, familia_id, gateway_token),
        daemon=True,
    )
    hilo_procesamiento.start()

    # La captura bloquea el hilo principal
    capturar_audio()


if __name__ == "__main__":
    import os

    # Estos valores vienen de variables de entorno en producción
    ALUMNO_ID     = os.getenv("TEA_ALUMNO_ID", "alumno_demo")
    FAMILIA_ID    = os.getenv("TEA_FAMILIA_ID", "familia_demo")
    GATEWAY_TOKEN = os.getenv("TEA_GATEWAY_TOKEN", "token_demo")

    iniciar_gateway(ALUMNO_ID, FAMILIA_ID, GATEWAY_TOKEN)
