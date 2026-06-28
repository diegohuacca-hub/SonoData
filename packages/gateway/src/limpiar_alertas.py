"""
limpiar_alertas.py — Borra todas las alertas de Firestore
Úsalo una sola vez para limpiar el spam de alertas viejas.

Uso:
    cd C:\\xampp\\htdocs\\SonoData\\packages\\gateway
    myvenv\\Scripts\\activate.bat
    cd src
    ..\\myvenv\\Scripts\\python.exe limpiar_alertas.py
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "sonodata-543f4")
API_KEY    = os.getenv("FIREBASE_API_KEY", "")
ALUMNO_ID  = os.getenv("ALUMNO_ID", "alumno_001")

BASE = (
    f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}"
    f"/databases/(default)/documents/alumnos/{ALUMNO_ID}/alertas_sensor"
)


def listar_alertas():
    """Lista todos los documentos de alertas_sensor (paginado)."""
    docs = []
    page_token = None
    while True:
        url = f"{BASE}?key={API_KEY}&pageSize=300"
        if page_token:
            url += f"&pageToken={page_token}"
        resp = requests.get(url, timeout=10)
        if resp.status_code != 200:
            print(f"Error listando: {resp.status_code} {resp.text[:150]}")
            break
        data = resp.json()
        for d in data.get("documents", []):
            docs.append(d["name"])  # path completo del documento
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return docs


def borrar_documento(doc_path: str):
    """Borra un documento por su path completo."""
    # doc_path ya viene como projects/.../documents/alumnos/...
    url = f"https://firestore.googleapis.com/v1/{doc_path}?key={API_KEY}"
    resp = requests.delete(url, timeout=10)
    return resp.status_code in (200, 204)


def main():
    print("=" * 55)
    print("  SonoData TEA — Limpieza de alertas")
    print("=" * 55)

    if not API_KEY:
        print("ERROR: falta FIREBASE_API_KEY en .env")
        return

    print("\nBuscando alertas...")
    docs = listar_alertas()
    total = len(docs)

    if total == 0:
        print("No hay alertas que borrar. Todo limpio.")
        return

    print(f"Encontradas {total} alertas.")
    confirmar = input(f"¿Borrar las {total} alertas? (escribe SI para confirmar): ")
    if confirmar.strip().upper() != "SI":
        print("Cancelado.")
        return

    borradas = 0
    for i, doc_path in enumerate(docs, 1):
        if borrar_documento(doc_path):
            borradas += 1
        if i % 20 == 0:
            print(f"  Borradas {i}/{total}...")

    print(f"\n✓ Listo. {borradas}/{total} alertas borradas.")


if __name__ == "__main__":
    main()
