"""
yamnet_listener.py — Pipeline de audio con YAMNet v2
Mejoras sobre v1:
  1. Votación temporal — confirma sonido en 3 frames antes de reportar
  2. Agrupación por categorías — timbre/campana/ding-dong → "Timbre"
  3. Cooldown por categoría — evita spam del mismo sonido
  4. Umbral de dB adaptativo — calibra según ruido de fondo del ambiente
  5. Confianza mínima por categoría — algunos sonidos requieren más certeza

El audio NUNCA se guarda ni se envía a ningún servidor.
Solo el evento clasificado viaja a Firebase.
"""

import numpy as np
import sounddevice as sd
import tensorflow as tf
import tensorflow_hub as hub
import threading
import time
import os
from queue import Queue
from collections import deque
from dotenv import load_dotenv

load_dotenv()

# ─── Configuración ─────────────────────────────────────────────────────────────
SAMPLE_RATE    = 16000
CHUNK_DURATION = 1.0
DEVICE_INDEX   = os.getenv("AUDIO_DEVICE_INDEX", None)
if DEVICE_INDEX:
    DEVICE_INDEX = int(DEVICE_INDEX)

# ─── Parámetros de votación y filtrado ────────────────────────────────────────
FRAMES_CONFIRMACION = 3      # frames consecutivos para confirmar un sonido
COOLDOWN_SEGUNDOS   = 3      # segundos mínimos entre reportes de la misma categoría
CONFIANZA_MIN_BASE  = 0.65   # confianza mínima global
DB_MIN_BASE         = 10     # dB mínimo global
CALIBRACION_FRAMES  = 10    # frames para calibrar ruido de fondo al inicio

# ─── Categorías agrupadas ─────────────────────────────────────────────────────
# Agrupa clases similares bajo un nombre común
# Esto reduce falsos negativos cuando YAMNet varía entre clases parecidas
CATEGORIAS = {
    'Timbre / teléfono': {
        'clases':    [195, 196, 349, 350, 383, 384, 385, 386, 387, 388, 389, 392],
        'confianza': 0.35,
        'db_min':    20,
        'severidad': 4,
        'emoji':     '🔔',
        'frames':    2,
    },
    'Llanto / bebé': {
        'clases':    [19, 20, 21, 22, 6, 9, 10, 11],
        'confianza': 0.35,
        'db_min':    20,
        'severidad': 4,
        'emoji':     '😢',
        'frames':    2,
    },
    'Voz / multitud': {
        'clases':    [0, 1, 63, 64, 65, 66, 137],
        'confianza': 0.35,
        'db_min':    20,
        'severidad': 1,
        'emoji':     '🗣️',
        'frames':    3,
    },
    'Sirena / alarma': {
        'clases':    [304, 316, 317, 318, 382, 390, 391, 393, 394],
        'confianza': 0.35,
        'db_min':    20,
        'severidad': 5,
        'emoji':     '🚨',
        'frames':    2,
    },
    'Maquinaria ruidosa': {
    'clases':    [339, 340, 341, 362, 363, 367, 371, 
                  405, 406, 407, 412, 413, 414, 415, 418, 419],
    'confianza': 0.35,
    'db_min':    20,
    'severidad': 4,
    'emoji':     '⚙️',
    'frames':    2,
    },
    'Tráfico': {
        'clases':    [300, 301, 302, 306, 307, 310, 315, 319, 320, 321, 323, 333],
        'confianza': 0.35,
        'db_min':    15,
        'severidad': 3,
        'emoji':     '🚗',
        'frames':    2,
    },
    'Música alta': {
        'clases':    [211, 212, 214, 215, 234, 240,132],
        'confianza': 0.35,
        'db_min':    15,
        'severidad': 3,
        'emoji':     '🎵',
        'frames':    2,
    },
    'Explosión / impacto': {
        'clases':    [420, 421, 426, 427, 430, 460, 462, 463, 446, 398],
        'confianza': 0.20,
        'db_min':    15,
        'severidad': 5,
        'emoji':     '💥',
        'frames':    1,
    },
    'Portazo': {
        'clases':    [352, 498, 455, 448, 500, 156, 348, 353,345],
        'confianza': 0.20,
        'db_min':    15,
        'severidad': 2,
        'emoji':     '🚪',
        'frames':    1,
    },
    'Tormenta': {
        'clases':    [280, 281, 294, 56],
        'confianza': 0.25,
        'db_min':    15,
        'severidad': 3,
        'emoji':     '⛈️',
        'frames':    3,
    },
    'Perro ladrando': {
        'clases':    [67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
        'confianza': 0.35,
        'db_min':    15,
        'severidad': 3,
        'emoji':     '🐕',
        'frames':    1,
    },
    'Niños gritando': {
        'clases':    [12, 13, 14, 15, 182, 180],
        'confianza': 0.35,
        'db_min':    15,
        'severidad': 4,
        'emoji':     '😱',
        'frames':    1,
    },
    'Ruido de fondo': {
        'clases':    [513, 518, 519],
        'confianza': 0.35,
        'db_min':    15,
        'severidad': 2,
        'emoji':     '📺',
        'frames':    3,
    },
}

# Mapa inverso: clase_idx → nombre_categoria
_CLASE_A_CATEGORIA: dict[int, str] = {}
for cat_nombre, cat_data in CATEGORIAS.items():
    for clase_idx in cat_data['clases']:
        _CLASE_A_CATEGORIA[clase_idx] = cat_nombre

# ─── Estado global ─────────────────────────────────────────────────────────────
_audio_queue: Queue = Queue(maxsize=20)
_modelo       = None
_corriendo    = False

# Votación temporal: deque de las últimas N clasificaciones
_ventana_votos: deque = deque(maxlen=FRAMES_CONFIRMACION)

# Cooldown: timestamp del último reporte por categoría
_ultimo_reporte: dict[str, float] = {}

# Nivel de ruido de fondo calibrado
_db_fondo: float = DB_MIN_BASE


def listar_dispositivos():
    print("\n[Audio] Dispositivos de entrada disponibles:")
    print("-" * 50)
    for i, dev in enumerate(sd.query_devices()):
        if dev["max_input_channels"] > 0:
            print(f"  [{i}] {dev['name']}")
    print("-" * 50)
    print("Configura AUDIO_DEVICE_INDEX en .env\n")


def cargar_modelo():
    global _modelo
    print("[YAMNet] Cargando modelo (primera vez tarda ~30 segundos)...")
    _modelo = hub.load("https://tfhub.dev/google/yamnet/1")
    print("[YAMNet] Modelo cargado correctamente")


def calcular_db(audio: np.ndarray) -> float:
    rms = np.sqrt(np.mean(np.square(audio)))
    if rms < 1e-10:
        return 0.0
    return round(float(20 * np.log10(rms + 1e-9) + 94), 1)


def calibrar_ruido_fondo(db_actual: float):
    """
    Calibra el umbral de dB adaptativo según el ruido de fondo del ambiente.
    Se actualiza continuamente con un promedio móvil suavizado.
    """
    global _db_fondo
    # Promedio exponencial — el fondo se adapta lentamente
    _db_fondo = 0.95 * _db_fondo + 0.05 * db_actual


def clasificar_chunk(audio: np.ndarray) -> tuple[str|None, float, float, int]:
    """
    Clasifica un chunk con YAMNet.
    Retorna (categoria, confianza, db, severidad) o (None, conf, db, 0)
    """
    global _modelo, _ventana_votos, _ultimo_reporte, _db_fondo

    if _modelo is None:
        return None, 0.0, 0.0, 0

    scores, _, _ = _modelo(audio)
    scores_np    = scores.numpy()
    scores_mean  = np.mean(scores_np, axis=0)
    clase_idx    = int(np.argmax(scores_mean))
    confianza    = float(scores_mean[clase_idx])
    db           = calcular_db(audio)
    
    # Actualizar calibración de ruido de fondo
    calibrar_ruido_fondo(db)

    # Umbral dinámico: DB_MIN_BASE o fondo + 8dB (lo que sea mayor)
    db_umbral = max(DB_MIN_BASE, _db_fondo + 5)

    # ── Verificar si la clase pertenece a alguna categoría ────────────────────
    categoria = _CLASE_A_CATEGORIA.get(clase_idx)

    if categoria is None:
        # Solo resetear si hay 3 silencios consecutivos
        _ventana_votos.append(None)
        silencios = sum(1 for v in _ventana_votos if v is None)
        if silencios >= 3:
            _ventana_votos.clear()
        # Reportar ruido muy fuerte aunque no sea categoría conocida
        if db >= 85:
            return 'Ruido muy fuerte', confianza, db, 3
        return None, confianza, db, 0

    cat_data = CATEGORIAS[categoria]

    # Verificar umbrales específicos de la categoría
    if confianza < cat_data['confianza']:
        _ventana_votos.append(None)
        return None, confianza, db, 0

    if db < max(db_umbral, cat_data['db_min']):
        _ventana_votos.append(None)
        return None, confianza, db, 0

    # ── Votación temporal ─────────────────────────────────────────────────────
    _ventana_votos.append(categoria)

    # Contar cuántas veces aparece esta categoría en la ventana
    votos = sum(1 for v in _ventana_votos if v == categoria)

    frames_necesarios = cat_data.get('frames', FRAMES_CONFIRMACION)
    if votos < frames_necesarios:
        # No hay suficiente confirmación todavía
        return None, confianza, db, 0

    # ── Cooldown ───────────────────────────────────────────────────────────────
    ahora = time.time()
    ultimo = _ultimo_reporte.get(categoria, 0)
    if ahora - ultimo < COOLDOWN_SEGUNDOS:
        return None, confianza, db, 0

    # ── Confirmar evento ───────────────────────────────────────────────────────
    _ultimo_reporte[categoria] = ahora
    _ventana_votos.clear()  # Resetear ventana después de confirmar

    return categoria, confianza, db, cat_data['severidad']


def _capturar_audio():
    chunk_samples = int(SAMPLE_RATE * CHUNK_DURATION)

    def callback(indata, frames, time_info, status):
        if status:
            print(f"[Audio] Advertencia: {status}")
        mono = indata[:, 0].astype(np.float32)
        if not _audio_queue.full():
            _audio_queue.put(mono.copy())

    kwargs = {
        "samplerate": SAMPLE_RATE,
        "channels":   1,
        "blocksize":  chunk_samples,
        "dtype":      np.float32,
        "callback":   callback,
    }
    if DEVICE_INDEX is not None:
        kwargs["device"] = DEVICE_INDEX

    print(f"[Audio] Capturando desde dispositivo: {DEVICE_INDEX or 'default'}")
    with sd.InputStream(**kwargs):
        while _corriendo:
            time.sleep(0.1)


def iniciar(callback_evento):
    """
    Inicia el pipeline de audio mejorado.
    callback_evento(categoria, confianza, db, severidad) se llama
    solo cuando el sonido es confirmado por votación temporal.
    """
    global _corriendo

    if _modelo is None:
        cargar_modelo()

    _corriendo = True

    hilo_captura = threading.Thread(target=_capturar_audio, daemon=True)
    hilo_captura.start()

    categorias_str = ', '.join(CATEGORIAS.keys())
    print("[YAMNet] Pipeline activo v2 — votación temporal + categorías agrupadas")
    print(f"[YAMNet] Categorías: {categorias_str}")
    print(f"[YAMNet] Confirmación: {FRAMES_CONFIRMACION} frames | Cooldown: {COOLDOWN_SEGUNDOS}s")

    try:
        frames_calibracion = 0
        while _corriendo:
            if _audio_queue.empty():
                time.sleep(0.05)
                continue

            audio_chunk = _audio_queue.get()
            categoria, confianza, db, severidad = clasificar_chunk(audio_chunk)

            # Período de calibración inicial
            if frames_calibracion < CALIBRACION_FRAMES:
                frames_calibracion += 1
                if frames_calibracion == CALIBRACION_FRAMES:
                    print(f"[YAMNet] Calibración completada — ruido de fondo: {_db_fondo:.1f} dB")
                continue

            if categoria:
                cat_data = CATEGORIAS.get(categoria, {})
                emoji    = cat_data.get('emoji', '🔊')
                hora     = time.strftime("%H:%M:%S")
                print(f"[{hora}] {emoji} {categoria} | {confianza:.0%} | {db} dB | sev:{severidad}")
                callback_evento(categoria, confianza, db, severidad)

    except KeyboardInterrupt:
        print("\n[YAMNet] Detenido por el usuario")
    finally:
        _corriendo = False


def detener():
    global _corriendo
    _corriendo = False


# ─── Prueba independiente ─────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("  SonoData TEA — Test de audio YAMNet v2")
    print("  Votación temporal + Categorías + Cooldown + Calibración")
    print("=" * 55)

    listar_dispositivos()

    def test_callback(categoria, confianza, db, severidad):
        cat_data = CATEGORIAS.get(categoria, {})
        emoji    = cat_data.get('emoji', '🔊')
        print(f"  ✓ CONFIRMADO: {emoji} {categoria} ({confianza:.0%}) @ {db} dB | severidad: {severidad}")

    iniciar(test_callback)