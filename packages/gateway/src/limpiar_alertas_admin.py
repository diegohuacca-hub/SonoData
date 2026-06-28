"""
limpiar_alertas_admin.py — Borra alertas usando el Admin SDK
Usa serviceAccountKey.json, así que ignora las reglas de seguridad de Firestore.

Uso:
    cd C:\\xampp\\htdocs\\SonoData\\packages\\gateway
    myvenv\\Scripts\\activate.bat
    cd src
    ..\\myvenv\\Scripts\\python.exe limpiar_alertas_admin.py

Opciones:
    --solo-sensores   Borra solo alertas automáticas (tipo empieza con 'sensor_' o 'fusion_')
                      Conserva las alertas manuales del padre/terapeuta.
"""

import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore

ALUMNO_ID = os.getenv("ALUMNO_ID", "alumno_001")

# Ruta al service account (un nivel arriba de src/)
CRED_PATH = os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json")

SOLO_SENSORES = "--solo-sensores" in sys.argv


def main():
    print("=" * 55)
    print("  SonoData TEA — Limpieza de alertas (Admin SDK)")
    print("=" * 55)

    if not os.path.exists(CRED_PATH):
        print(f"ERROR: no se encontró serviceAccountKey.json en {CRED_PATH}")
        return

    # Inicializar Admin SDK
    if not firebase_admin._apps:
        cred = credentials.Certificate(CRED_PATH)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    ref = db.collection("alumnos").document(ALUMNO_ID).collection("alertas_sensor")

    docs = list(ref.stream())
    total = len(docs)

    if total == 0:
        print("No hay alertas que borrar. Todo limpio.")
        return

    # Filtrar si se pidió solo sensores
    if SOLO_SENSORES:
        objetivo = []
        for d in docs:
            tipo = (d.to_dict() or {}).get("tipo", "")
            if tipo.startswith("sensor_") or tipo.startswith("fusion_"):
                objetivo.append(d)
        print(f"Modo --solo-sensores: {len(objetivo)} de {total} alertas son automáticas.")
        docs = objetivo
        total = len(docs)
        if total == 0:
            print("No hay alertas automáticas que borrar.")
            return
    else:
        print(f"Encontradas {total} alertas (TODAS, incluidas manuales).")

    confirmar = input(f"¿Borrar {total} alertas? (escribe SI para confirmar): ")
    if confirmar.strip().upper() != "SI":
        print("Cancelado.")
        return

    # Borrado por lotes (batch máx 500)
    borradas = 0
    batch = db.batch()
    for i, d in enumerate(docs, 1):
        batch.delete(d.reference)
        if i % 400 == 0:
            batch.commit()
            batch = db.batch()
            print(f"  Borradas {i}/{total}...")
        borradas += 1
    batch.commit()

    print(f"\n✓ Listo. {borradas} alertas borradas.")


if __name__ == "__main__":
    main()
