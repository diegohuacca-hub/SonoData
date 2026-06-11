"""
firebase_client.py — Envía eventos de sensores a Firebase
Solo envía el EVENTO clasificado, nunca el audio/video crudo
"""

import os
import time
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID   = os.getenv("FIREBASE_PROJECT_ID", "sonodata-543f4")
API_KEY      = os.getenv("FIREBASE_API_KEY", "")
DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL", "")
ALUMNO_ID    = os.getenv("ALUMNO_ID", "alumno_001")
FAMILIA_ID   = os.getenv("FAMILIA_ID", "familia_001")

# ─── Caché de token de autenticación ─────────────────────────────────────────
_token_cache = {"token": None, "expira": 0}

def obtener_token() -> str:
    """Obtiene token de Firebase Auth (lo renueva cada hora)"""
    if _token_cache["token"] and time.time() < _token_cache["expira"]:
        return _token_cache["token"]
    return ""  # En desarrollo sin auth retorna vacío

# ─── Realtime Database — datos live del dashboard ─────────────────────────────
def escribir_realtime(tipo: str, valor: float, extra: dict = None):
    """
    Escribe en Realtime DB para el dashboard live del padre.
    Latencia < 50ms — aparece instantáneamente en React.
    """
    if not DATABASE_URL:
        print(f"[Firebase] Sin DATABASE_URL — dato no enviado: {tipo}={valor}")
        return

    ruta = f"sensores_live/{FAMILIA_ID}/{ALUMNO_ID}/{tipo}.json"
    url  = f"{DATABASE_URL}/{ruta}?auth={API_KEY}"

    payload = {
        "valor":     valor,
        "timestamp": int(time.time() * 1000),
        "source":    "gateway_python",
        **(extra or {}),
    }

    try:
        resp = requests.put(url, json=payload, timeout=3)
        if resp.status_code != 200:
            print(f"[Firebase RTDB] Error {resp.status_code}: {resp.text[:100]}")
    except requests.exceptions.RequestException as e:
        print(f"[Firebase RTDB] Sin conexión: {e}")

# ─── Firestore — historial y alertas ─────────────────────────────────────────
def escribir_firestore(coleccion: str, datos: dict):
    """
    Escribe un documento en Firestore.
    Usado para: eventos de sensor, alertas, actualización mapa sensorial.
    """
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}"
        f"/databases/(default)/documents/alumnos/{ALUMNO_ID}/{coleccion}"
        f"?key={API_KEY}"
    )

    # Convertir dict Python a formato Firestore
    campos = {}
    for k, v in datos.items():
        if isinstance(v, str):
            campos[k] = {"stringValue": v}
        elif isinstance(v, bool):
            campos[k] = {"booleanValue": v}
        elif isinstance(v, int):
            campos[k] = {"integerValue": str(v)}
        elif isinstance(v, float):
            campos[k] = {"doubleValue": v}
        else:
            campos[k] = {"stringValue": str(v)}

    payload = {"fields": campos}

    try:
        resp = requests.post(url, json=payload, timeout=5)
        if resp.status_code not in [200, 201]:
            print(f"[Firestore] Error {resp.status_code}: {resp.text[:150]}")
    except requests.exceptions.RequestException as e:
        print(f"[Firestore] Sin conexión: {e}")

# ─── Enviar evento de audio ───────────────────────────────────────────────────
def enviar_evento_audio(clasificacion: str, confianza: float, db_nivel: float, severidad: int = 2):
    """
    Envía evento de audio clasificado por YAMNet v2.
    IMPORTANTE: nunca se envía el audio crudo, solo la clasificación.
    """
    print(f"[Audio] {clasificacion} | confianza: {confianza:.0%} | {db_nivel} dB | sev:{severidad}")

    # 1. Actualizar dashboard live
    escribir_realtime("audio_db",    db_nivel)
    escribir_realtime("audio_clase", 1, {
        "clasificacion": clasificacion,
        "confianza":     round(confianza, 3),
        "severidad":     severidad,
    })

    # 2. Guardar en historial si severidad >= 3 o dB alto
    umbral_db = float(os.getenv("UMBRAL_DB", "75"))
    if db_nivel >= umbral_db or severidad >= 3:
        escribir_firestore("eventos_audio", {
            "tipo":          "audio_clase",
            "clasificacion": clasificacion,
            "confianza":     round(confianza, 3),
            "db_nivel":      db_nivel,
            "severidad":     severidad,
            "alumno_id":     ALUMNO_ID,
            "familia_id":    FAMILIA_ID,
            "timestamp":     int(time.time() * 1000),
            "source":        "yamnet_local",
        })

    # 3. Generar alerta automática si severidad >= 4
    if severidad >= 4:
        print(f"[ALERTA] Sonido crítico: {clasificacion} (sev:{severidad})")
        escribir_firestore("alertas_sensor", {
            "tipo":       "sensor_audio",
            "severidad":  severidad,
            "titulo":     f"Sonido crítico: {clasificacion}",
            "descripcion": f"Detectado {clasificacion} con {confianza:.0%} de confianza a {db_nivel} dB",
            "alumno_id":  ALUMNO_ID,
            "familia_id": FAMILIA_ID,
            "timestamp":  int(time.time() * 1000),
            "resuelta":   False,
        })
# ─── Enviar lectura de FC ─────────────────────────────────────────────────────
def enviar_fc(bpm: int):
    """Envía frecuencia cardíaca de la Mi Band."""
    print(f"[Mi Band] FC: {bpm} bpm")
    escribir_realtime("fc_bpm", bpm)

    umbral_fc = int(os.getenv("UMBRAL_FC", "100"))
    if bpm >= umbral_fc:
        print(f"[ALERTA] FC elevada: {bpm} bpm (umbral: {umbral_fc})")
        escribir_firestore("alertas_sensor", {
            "tipo":       "sensor_fc",
            "severidad":  4 if bpm >= 120 else 3,
            "titulo":     f"FC elevada: {bpm} bpm",
            "descripcion":"Frecuencia cardíaca por encima del umbral configurado",
            "alumno_id":  ALUMNO_ID,
            "familia_id": FAMILIA_ID,
            "timestamp":  int(time.time() * 1000),
            "resuelta":   False,
        })

# ─── Enviar emoción detectada por cámara ─────────────────────────────────────
def enviar_emocion(emocion: str, confianza: float):
    """Envía emoción detectada por MediaPipe. Nunca se envía el video."""
    print(f"[Cámara] Emoción: {emocion} ({confianza:.0%})")
    escribir_realtime("emocion_facial", 1, {
        "emocion":   emocion,
        "confianza": round(confianza, 3),
    })

# ─── Enviar movimiento ───────────────────────────────────────────────────────
def enviar_movimiento(nivel: float, estereotipia: bool = False):
    """Envía nivel de movimiento y si se detectó conducta repetitiva."""
    escribir_realtime("movimiento", nivel)
    if estereotipia:
        print(f"[Mi Band] Posible estereotipia detectada")
        escribir_firestore("alertas_sensor", {
            "tipo":       "sensor_movimiento",
            "severidad":  3,
            "titulo":     "Conducta repetitiva detectada",
            "descripcion":"Patrón de movimiento repetitivo sostenido por más de 30 segundos",
            "alumno_id":  ALUMNO_ID,
            "familia_id": FAMILIA_ID,
            "timestamp":  int(time.time() * 1000),
            "resuelta":   False,
        })
