"""
gateway.py — Script principal del gateway SonoData TEA
Orquesta todos los sensores simultáneamente:
  - YAMNet (audio via micrófono PC o celular WO Mic)
  - HSEmotion (video via cámara PC o celular DroidCam)
  - Mi Band 8 (FC + movimiento via Bluetooth)

v2 — El audio ahora corre en un hilo separado para no bloquear la cámara.

Uso:
  python gateway.py              → todos los sensores
  python gateway.py --audio      → solo audio
  python gateway.py --miband     → solo Mi Band
  python gateway.py --camara     → solo cámara
  python gateway.py --audio --camara → audio + cámara
  python gateway.py --test       → modo prueba sin Firebase
"""

import sys
import time
import argparse
import os
import threading
from dotenv import load_dotenv

load_dotenv()

from firebase_client import (
    enviar_evento_audio,
    enviar_fc,
    enviar_emocion,
    enviar_movimiento,
)


def main():
    parser = argparse.ArgumentParser(description="Gateway SonoData TEA")
    parser.add_argument("--audio",  action="store_true", help="Solo módulo de audio")
    parser.add_argument("--miband", action="store_true", help="Solo Mi Band BLE")
    parser.add_argument("--camara", action="store_true", help="Solo cámara")
    parser.add_argument("--test",   action="store_true", help="Modo prueba (sin Firebase)")
    parser.add_argument("--listar", action="store_true", help="Listar dispositivos disponibles")
    args = parser.parse_args()

    print("=" * 60)
    print("  SonoData TEA — Gateway de sensores v1.0")
    print(f"  Alumno: {os.getenv('ALUMNO_ID', 'alumno_001')}")
    print(f"  Proyecto Firebase: {os.getenv('FIREBASE_PROJECT_ID', 'sonodata-543f4')}")
    print("=" * 60)

    # Modo listar dispositivos
    if args.listar:
        print("\n[Gateway] Listando dispositivos disponibles...")
        from yamnet_listener import listar_dispositivos
        listar_dispositivos()
        import cv2
        print("Cámaras disponibles:")
        for i in range(5):
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                print(f"  [{i}] Cámara disponible")
                cap.release()
        return

    # Modo prueba: reemplaza Firebase con prints
    if args.test:
        print("\n[Gateway] MODO PRUEBA — Los datos no se enviarán a Firebase\n")
        import firebase_client as fc
        fc.enviar_evento_audio = lambda c, conf, db, sev=2: print(f"[TEST] Audio: {c} ({conf:.0%}) {db}dB sev:{sev}")
        fc.enviar_fc           = lambda bpm: print(f"[TEST] FC: {bpm} bpm")
        fc.enviar_emocion      = lambda e, c: print(f"[TEST] Emoción: {e} ({c:.0%})")
        fc.enviar_movimiento   = lambda n, est: print(f"[TEST] Movimiento: {n}% {'ESTEREOTIPIA' if est else ''}")

    # Determinar qué módulos activar
    todo    = not (args.audio or args.miband or args.camara)
    audio   = todo or args.audio
    miband  = todo or args.miband
    camara  = todo or args.camara

    modulos_activos = []
    hilos = []
    _camara = None

    # ── Módulo de audio (YAMNet) — EN HILO SEPARADO ────────────────────────────
    # iniciar() tiene un bucle infinito, así que va en su propio hilo
    # para no bloquear el arranque de la cámara.
    if audio:
        try:
            import yamnet_listener
            hilo_audio = threading.Thread(
                target=yamnet_listener.iniciar,
                kwargs={"callback_evento": enviar_evento_audio},
                daemon=True,
            )
            hilo_audio.start()
            hilos.append(("YAMNet", yamnet_listener, hilo_audio))
            modulos_activos.append("YAMNet audio")
            # Pequeña pausa para que el modelo cargue antes de seguir
            time.sleep(2)
        except Exception as e:
            print(f"[Gateway] Error iniciando audio: {e}")
            print("[Gateway] ¿Instalaste las dependencias? pip install -r requirements.txt")

    # ── Módulo de Mi Band — EN HILO SEPARADO ───────────────────────────────────
    if miband:
        try:
            import ble_miband
            hilo_miband = threading.Thread(
                target=ble_miband.iniciar,
                kwargs={
                    "callback_fc": enviar_fc,
                    "callback_mov": enviar_movimiento,
                },
                daemon=True,
            )
            hilo_miband.start()
            hilos.append(("Mi Band", ble_miband, hilo_miband))
            modulos_activos.append("Mi Band BLE")
        except Exception as e:
            print(f"[Gateway] Error iniciando Mi Band: {e}")
            print("[Gateway] ¿Bluetooth activado? ¿Mi Band vinculada?")

    # ── Módulo de cámara (HSEmotion) — EN HILO SEPARADO ────────────────────────
    if camara:
        try:
            import cam_mediapipe
            CAMARA_INDEX = int(os.getenv("CAMARA_INDEX", "0"))
            _camara = cam_mediapipe.CamaraFER(
                camara_index=CAMARA_INDEX,
                callback=enviar_emocion,
            )
            hilo_camara = threading.Thread(
                target=_camara.iniciar,
                daemon=True,
            )
            hilo_camara.start()
            hilos.append(("Cámara", _camara, hilo_camara))
            modulos_activos.append("Cámara HSEmotion")
        except Exception as e:
            print(f"[Gateway] Error iniciando cámara: {e}")
            print("[Gateway] ¿Cámara disponible? Verifica CAMARA_INDEX en .env")

    if not modulos_activos:
        print("[Gateway] No se pudo iniciar ningún módulo. Revisa los errores arriba.")
        return

    print(f"\n[Gateway] Módulos activos: {', '.join(modulos_activos)}")
    print("[Gateway] Enviando datos a Firebase en tiempo real...")
    print("[Gateway] Motor de fusión de alertas ACTIVO")
    print("[Gateway] Presiona Ctrl+C para detener\n")

    # Mantener el proceso vivo + heartbeat
    try:
        ultimo_heartbeat = 0
        while True:
            time.sleep(1)
            ahora = int(time.time())
            if ahora - ultimo_heartbeat >= 30:
                from firebase_client import escribir_realtime
                escribir_realtime("gateway_heartbeat", ahora)
                ultimo_heartbeat = ahora

    except KeyboardInterrupt:
        print("\n[Gateway] Deteniendo todos los módulos...")

        for nombre, modulo, hilo in hilos:
            try:
                modulo.detener()
                print(f"[Gateway] {nombre} detenido")
            except Exception:
                pass

        print("[Gateway] Gateway detenido correctamente")


if __name__ == "__main__":
    main()
