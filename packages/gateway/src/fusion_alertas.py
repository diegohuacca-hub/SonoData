"""
fusion_alertas.py — Motor de correlación de sensores para SonoData TEA
─────────────────────────────────────────────────────────────────────
Genera alertas SOLO cuando múltiples fuentes independientes describen el
mismo estado de riesgo dentro de una ventana temporal (evidencia convergente).

Principio de diseño:
    "Una alerta se genera únicamente cuando múltiples fuentes independientes
     describen el mismo estado de riesgo dentro de una ventana temporal dada."

Inspirado en fusión multisensorial y reducción de falsos positivos por
correlación temporal de eventos.

Mejoras v2:
  • FC personalizada por niño — umbral relativo a su FC basal, no fijo.
    Cada niño con TEA tiene una línea base distinta; usar un umbral genérico
    (ej. 115 bpm) sería clínicamente incorrecto.
  • Ventana de correlación configurable vía .env (VENTANA_FUSION).
  • Confianza mínima en emoción — la visión computacional es el sensor más
    ruidoso, así que se descartan emociones detectadas con baja certeza.

Reglas de fusión:
  R1. Crisis sensorial    → FC alta + sonido fuerte + emoción negativa   (Sev 5)
  R2. Sobrecarga auditiva → sonido crítico + emoción negativa            (Sev 4)
  R3. Activación física   → FC alta + estereotipia                       (Sev 4)
  R4. Defensa sensorial   → sonido crítico + FC elevada                  (Sev 4)
"""

import time
import os
import requests
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "sonodata-543f4")
API_KEY    = os.getenv("FIREBASE_API_KEY", "")
ALUMNO_ID  = os.getenv("ALUMNO_ID", "alumno_001")
FAMILIA_ID = os.getenv("FAMILIA_ID", "familia_001")

# ─── Ventana de correlación (configurable) ─────────────────────────────────────
# Dos señales se consideran "simultáneas" si ocurren dentro de esta ventana.
# Ajustable tras pruebas reales: 5s puede ser muy estricto, 15s muy permisivo.
VENTANA_CORRELACION = float(os.getenv("VENTANA_FUSION", "8.0"))

# Cooldown por regla — evita inundar al cuidador con la misma alerta
COOLDOWN_FUSION = float(os.getenv("COOLDOWN_FUSION", "60.0"))

# ─── FC personalizada por niño ─────────────────────────────────────────────────
# El umbral NO es fijo: se calcula relativo a la FC basal del niño en reposo.
# Para Mateo (basal ~88) → FC_ALTA ≈ 114, FC_ELEVADA ≈ 101.
# Esto se puede sobreescribir por alumno desde .env o Firestore.
FC_BASAL   = int(os.getenv("FC_BASAL", "88"))
FC_ALTA    = FC_BASAL * 1.30   # +30% sobre basal → activación marcada
FC_ELEVADA = FC_BASAL * 1.15   # +15% sobre basal → activación leve

# ─── Confianza mínima de emoción ───────────────────────────────────────────────
# La visión computacional (HSEmotion) es el sensor más incierto.
# Se descartan emociones negativas detectadas con baja certeza para no
# disparar alertas por una lectura dudosa de la cámara.
CONFIANZA_EMOCION_MIN = float(os.getenv("CONFIANZA_EMOCION_MIN", "0.55"))

EMOCIONES_NEGATIVAS = {'frustrado', 'saturado', 'ansioso'}

# ─── Estado compartido de sensores ─────────────────────────────────────────────
_estado = {
    'audio':       {'clasificacion': None, 'severidad': 0, 'db': 0,  'ts': 0},
    'fc':          {'bpm': 0,              'ts': 0},
    'emocion':     {'emocion': 'neutral',  'confianza': 0.0, 'ts': 0},
    'movimiento':  {'estereotipia': False, 'nivel': 0, 'ts': 0},
}

_ultimo_disparo: dict[str, float] = {}


def configurar_fc_basal(basal: int):
    """Permite recalibrar la FC basal del niño en runtime (ej. desde Firestore)."""
    global FC_BASAL, FC_ALTA, FC_ELEVADA
    FC_BASAL   = basal
    FC_ALTA    = basal * 1.30
    FC_ELEVADA = basal * 1.15
    print(f"[FUSIÓN] FC basal configurada: {basal} → alta:{FC_ALTA:.0f} elevada:{FC_ELEVADA:.0f}")


def _vigente(sensor_ts: float) -> bool:
    return (time.time() - sensor_ts) <= VENTANA_CORRELACION


def _escribir_alerta_firestore(tipo, severidad, titulo, descripcion):
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}"
        f"/databases/(default)/documents/alumnos/{ALUMNO_ID}/alertas_sensor"
        f"?key={API_KEY}"
    )
    payload = {
        "fields": {
            "tipo":        {"stringValue": tipo},
            "severidad":   {"integerValue": str(severidad)},
            "titulo":      {"stringValue": titulo},
            "descripcion": {"stringValue": descripcion},
            "alumno_id":   {"stringValue": ALUMNO_ID},
            "familia_id":  {"stringValue": FAMILIA_ID},
            "timestamp":   {"integerValue": str(int(time.time() * 1000))},
            "resuelta":    {"booleanValue": False},
            "fusion":      {"booleanValue": True},
        }
    }
    try:
        resp = requests.post(url, json=payload, timeout=5)
        if resp.status_code in (200, 201):
            print(f"[FUSIÓN ✓] {titulo} (sev:{severidad})")
        else:
            print(f"[FUSIÓN] Error {resp.status_code}: {resp.text[:120]}")
    except requests.exceptions.RequestException as e:
        print(f"[FUSIÓN] Sin conexión: {e}")


def _puede_disparar(regla: str) -> bool:
    ahora = time.time()
    if ahora - _ultimo_disparo.get(regla, 0) < COOLDOWN_FUSION:
        return False
    _ultimo_disparo[regla] = ahora
    return True


# ─── API pública: actualizar estado desde cada sensor ──────────────────────────
def actualizar_audio(clasificacion: str, severidad: int, db: float):
    _estado['audio'] = {
        'clasificacion': clasificacion,
        'severidad': severidad,
        'db': db,
        'ts': time.time(),
    }
    _evaluar_reglas()


def actualizar_fc(bpm: int):
    _estado['fc'] = {'bpm': bpm, 'ts': time.time()}
    _evaluar_reglas()


def actualizar_emocion(emocion: str, confianza: float = 1.0):
    """
    Actualiza emoción. Si es negativa pero la confianza es baja, se ignora
    (la cámara es el sensor más ruidoso → exigimos certeza mínima).
    """
    if emocion in EMOCIONES_NEGATIVAS and confianza < CONFIANZA_EMOCION_MIN:
        # Lectura demasiado incierta para considerarla evidencia
        return
    _estado['emocion'] = {
        'emocion': emocion,
        'confianza': confianza,
        'ts': time.time(),
    }
    _evaluar_reglas()


def actualizar_movimiento(nivel: float, estereotipia: bool):
    _estado['movimiento'] = {
        'estereotipia': estereotipia,
        'nivel': nivel,
        'ts': time.time(),
    }
    _evaluar_reglas()


# ─── Motor de reglas ───────────────────────────────────────────────────────────
def _evaluar_reglas():
    audio = _estado['audio']
    fc    = _estado['fc']
    emo   = _estado['emocion']
    mov   = _estado['movimiento']

    audio_vig = _vigente(audio['ts'])
    fc_vig    = _vigente(fc['ts'])
    emo_vig   = _vigente(emo['ts'])
    mov_vig   = _vigente(mov['ts'])

    fc_alta      = fc_vig and fc['bpm'] >= FC_ALTA
    fc_elevada   = fc_vig and fc['bpm'] >= FC_ELEVADA
    audio_fuerte = audio_vig and audio['severidad'] >= 4
    emo_negativa = emo_vig and emo['emocion'] in EMOCIONES_NEGATIVAS
    estereotipia = mov_vig and mov['estereotipia']

    # ── R1: Crisis sensorial (evidencia de los 3 sensores) ─────────────────────
    if fc_alta and audio_fuerte and emo_negativa:
        if _puede_disparar('crisis_sensorial'):
            _escribir_alerta_firestore(
                "fusion_crisis", 5,
                "⚠️ Posible crisis sensorial",
                f"FC {fc['bpm']} bpm (basal {FC_BASAL}) + {audio['clasificacion']} "
                f"({audio['db']} dB) + emoción '{emo['emocion']}' "
                f"(conf. {emo['confianza']:.0%}). Tres indicadores simultáneos "
                f"sugieren sobrecarga. Se recomienda intervención inmediata."
            )
        return

    # ── R2: Sobrecarga auditiva (audio + emoción) ──────────────────────────────
    if audio_fuerte and emo_negativa:
        if _puede_disparar('sobrecarga_auditiva'):
            _escribir_alerta_firestore(
                "fusion_auditiva", 4,
                "🔊 Sobrecarga auditiva",
                f"{audio['clasificacion']} a {audio['db']} dB coincidió con "
                f"emoción '{emo['emocion']}' (conf. {emo['confianza']:.0%}). "
                f"El estímulo sonoro está afectando el estado emocional."
            )
        return

    # ── R3: Activación física (FC + estereotipia) ──────────────────────────────
    if fc_alta and estereotipia:
        if _puede_disparar('activacion_fisica'):
            _escribir_alerta_firestore(
                "fusion_fisica", 4,
                "💓 Activación fisiológica",
                f"FC {fc['bpm']} bpm (basal {FC_BASAL}) junto con conducta "
                f"repetitiva sostenida. Posible mecanismo de autorregulación "
                f"ante estrés."
            )
        return

    # ── R4: Defensa sensorial (audio + FC elevada) ─────────────────────────────
    if audio_fuerte and fc_elevada:
        if _puede_disparar('defensa_sensorial'):
            _escribir_alerta_firestore(
                "fusion_defensa", 4,
                "🛡️ Respuesta de defensa sensorial",
                f"{audio['clasificacion']} provocó elevación de FC a {fc['bpm']} bpm "
                f"(basal {FC_BASAL}). Respuesta fisiológica al estímulo auditivo."
            )
        return


def estado_actual() -> dict:
    return dict(_estado)
