"""
firebase_client.py — Envía eventos de sensores a Firebase
Solo envía el EVENTO clasificado, nunca el audio/video crudo.

v2 — Integrado con motor de fusión:
  Las alertas ya NO se generan por sensor individual (eso producía spam).
  En su lugar, cada sensor alimenta fusion_alertas, que correlaciona los
  3 sensores y solo crea alertas cuando varios coinciden.
"""

import os
import time
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

import fusion_alertas  # motor de correlación

load_dotenv()

PROJECT_ID   = os.getenv("FIREBASE_PROJECT_ID", "sonodata-543f4")
API_KEY      = os.getenv("FIREBASE_API_KEY", "")
DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL", "")
ALUMNO_ID    = os.getenv("ALUMNO_ID", "alumno_001")
FAMILIA_ID   = os.getenv("FAMILIA_ID", "familia_001")

_token_cache = {"token": None, "expira": 0}

def obtener_token() -> str:
    if _token_cache["token"] and time.time() < _token_cache["expira"]:
        return _token_cache["token"]
    return ""

# ─── Realtime Database — datos live del dashboard ──────────────────────────────
def escribir_realtime(tipo: str, valor: float, extra: dict = None):
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

# ─── Firestore — historial y alertas ───────────────────────────────────────────
def escribir_firestore(coleccion: str, datos: dict):
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}"
        f"/databases/(default)/documents/alumnos/{ALUMNO_ID}/{coleccion}"
        f"?key={API_KEY}"
    )

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

# ─── Enviar evento de audio ────────────────────────────────────────────────────
def enviar_evento_audio(clasificacion: str, confianza: float, db_nivel: float, severidad: int = 2):
    """
    Envía evento de audio clasificado por YAMNet.
    Ya NO genera alerta directa — alimenta el motor de fusión.
    """
    print(f"[Audio] {clasificacion} | confianza: {confianza:.0%} | {db_nivel} dB | sev:{severidad}")

    # 1. Actualizar dashboard live
    escribir_realtime("audio_db",    db_nivel)
    escribir_realtime("audio_clase", 1, {
        "clasificacion": clasificacion,
        "confianza":     round(confianza, 3),
        "severidad":     severidad,
    })

    # 2. Guardar en historial si severidad alta (para reportes futuros)
    umbral_db = float(os.getenv("UMBRAL_DB", "75"))
    if db_nivel >= umbral_db or severidad >= 4:
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

    # 3. Alimentar motor de fusión (ya no genera alerta directa)
    fusion_alertas.actualizar_audio(clasificacion, severidad, db_nivel)

# ─── Enviar lectura de FC ──────────────────────────────────────────────────────
def enviar_fc(bpm: int):
    """Envía frecuencia cardíaca. Alimenta fusión en lugar de alertar directo."""
    print(f"[Watch] FC: {bpm} bpm")
    escribir_realtime("fc_bpm", bpm)

    # Alimentar motor de fusión
    fusion_alertas.actualizar_fc(bpm)

# ─── Enviar emoción detectada por cámara ───────────────────────────────────────
def enviar_emocion(emocion: str, confianza: float):
    """Envía emoción detectada. Nunca se envía el video."""
    print(f"[Cámara] Emoción: {emocion} ({confianza:.0%})")
    escribir_realtime("emocion_facial", 1, {
        "emocion":   emocion,
        "confianza": round(confianza, 3),
    })

    # Alimentar motor de fusión
    fusion_alertas.actualizar_emocion(emocion, confianza)

# ─── Enviar movimiento ─────────────────────────────────────────────────────────
def enviar_movimiento(nivel: float, estereotipia: bool = False):
    """Envía nivel de movimiento y si se detectó conducta repetitiva."""
    escribir_realtime("movimiento", nivel)

    # Alimentar motor de fusión
    fusion_alertas.actualizar_movimiento(nivel, estereotipia)
