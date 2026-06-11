"""
ble_miband.py — Conecta Mi Band 8 por Bluetooth y lee FC + movimiento
Usa la librería 'bleak' (multiplataforma: Windows, Mac, Linux)

Prerequisito: tener Bluetooth activado en la PC
La Mi Band debe estar descubierta y vinculada previamente en Windows
"""

import asyncio
import time
import struct
import os
import numpy as np
from bleak import BleakClient, BleakScanner
from dotenv import load_dotenv

load_dotenv()

MIBAND_MAC = os.getenv("MIBAND_MAC", "")  # Vacío = buscar automáticamente

# ─── UUIDs de características BLE de Mi Band 8 ───────────────────────────────
# Estos UUIDs son estándar para dispositivos Bluetooth LE de fitness
UUID_FC           = "00002a37-0000-1000-8000-00805f9b34fb"  # Heart Rate Measurement
UUID_ACELEROMETRO = "00000002-0000-3512-2118-0009af100700"  # Xiaomi custom
UUID_BATERIA      = "00002a19-0000-1000-8000-00805f9b34fb"  # Battery Level

# ─── Variables de estado ──────────────────────────────────────────────────────
_corriendo      = False
_ultima_fc      = 0
_historial_acel = []  # últimos 30 segundos de acelerómetro
_callback_fc    = None
_callback_mov   = None

# ─── Parsear datos de FC ──────────────────────────────────────────────────────
def _parsear_fc(data: bytearray) -> int:
    """
    Parsea el formato estándar BLE Heart Rate Measurement.
    Byte 0: flags, Byte 1: FC en bpm (si flag bit 0 = 0)
    """
    if len(data) < 2:
        return 0
    flags = data[0]
    if flags & 0x01:
        bpm = struct.unpack_from("<H", data, 1)[0]
    else:
        bpm = data[1]
    return bpm

# ─── Detectar estereotipia desde acelerómetro ────────────────────────────────
def _detectar_estereotipia(historial: list) -> bool:
    """
    Detecta conducta repetitiva (estereotipia) analizando el patrón
    del acelerómetro. Si hay movimiento rítmico sostenido por > 20s → True.
    """
    if len(historial) < 20:
        return False

    # Calcular varianza de la magnitud del vector de aceleración
    magnitudes = [np.sqrt(x**2 + y**2 + z**2) for x, y, z in historial[-20:]]
    varianza   = np.var(magnitudes)
    promedio   = np.mean(magnitudes)

    # Movimiento moderado y muy regular = posible estereotipia
    es_moderado = 1.0 < promedio < 4.0
    es_regular  = varianza < 0.3

    return es_moderado and es_regular

# ─── Buscar Mi Band automáticamente ──────────────────────────────────────────
async def _buscar_miband() -> str:
    """Escanea dispositivos BLE y busca la Mi Band 8."""
    print("[Mi Band] Buscando dispositivos BLE... (10 segundos)")
    dispositivos = await BleakScanner.discover(timeout=10.0)

    for d in dispositivos:
        nombre = d.name or ""
        if any(x in nombre for x in ["Mi Band", "Mi Smart Band", "Xiaomi"]):
            print(f"[Mi Band] Encontrada: {d.name} — {d.address}")
            return d.address

    print("[Mi Band] No se encontró ninguna Mi Band.")
    print("[Mi Band] Asegúrate de que el Bluetooth está activado y la pulsera vinculada.")
    return ""

# ─── Hilo de notificaciones FC ────────────────────────────────────────────────
def _handler_fc(sender, data: bytearray):
    global _ultima_fc
    bpm = _parsear_fc(data)
    if bpm > 0 and bpm < 220:
        _ultima_fc = bpm
        if _callback_fc:
            _callback_fc(bpm)

def _handler_acel(sender, data: bytearray):
    global _historial_acel
    try:
        # Parsear 3 valores int16 (x, y, z)
        if len(data) >= 6:
            x, y, z = struct.unpack_from("<hhh", data, 0)
            # Normalizar a m/s²
            xf, yf, zf = x/1000.0, y/1000.0, z/1000.0
            _historial_acel.append((xf, yf, zf))

            # Mantener solo últimos 60 segundos
            if len(_historial_acel) > 60:
                _historial_acel.pop(0)

            # Calcular nivel de movimiento (0-100)
            magnitud = np.sqrt(xf**2 + yf**2 + zf**2)
            nivel    = min(100, int(magnitud * 20))

            # Detectar estereotipia cada 5 lecturas
            estereotipia = False
            if len(_historial_acel) % 5 == 0:
                estereotipia = _detectar_estereotipia(_historial_acel)

            if _callback_mov:
                _callback_mov(nivel, estereotipia)

    except Exception as e:
        pass  # Ignorar errores de parseo

# ─── Conexión principal ───────────────────────────────────────────────────────
async def _conectar_y_leer(mac: str):
    """Conecta a la Mi Band y suscribe a notificaciones."""
    global _corriendo

    print(f"[Mi Band] Conectando a {mac}...")

    async with BleakClient(mac, timeout=15.0) as cliente:
        print(f"[Mi Band] Conectado. Batería: leyendo...")

        # Leer batería
        try:
            bateria = await cliente.read_gatt_char(UUID_BATERIA)
            print(f"[Mi Band] Batería: {bateria[0]}%")
        except:
            pass

        # Suscribir a FC
        try:
            await cliente.start_notify(UUID_FC, _handler_fc)
            print("[Mi Band] Leyendo frecuencia cardíaca...")
        except Exception as e:
            print(f"[Mi Band] Error suscribiendo FC: {e}")

        # Suscribir a acelerómetro
        try:
            await cliente.start_notify(UUID_ACELEROMETRO, _handler_acel)
            print("[Mi Band] Leyendo acelerómetro...")
        except Exception as e:
            print(f"[Mi Band] Acelerómetro no disponible: {e}")

        print("[Mi Band] Pipeline activo — leyendo sensores...")

        while _corriendo:
            await asyncio.sleep(1)

        await cliente.stop_notify(UUID_FC)

async def _iniciar_async(mac: str):
    """Loop principal con reconexión automática."""
    global _corriendo
    _corriendo = True

    while _corriendo:
        try:
            if not mac:
                mac = await _buscar_miband()
            if not mac:
                print("[Mi Band] Reintentando en 10 segundos...")
                await asyncio.sleep(10)
                continue

            await _conectar_y_leer(mac)

        except Exception as e:
            print(f"[Mi Band] Desconectada: {e}")
            if _corriendo:
                print("[Mi Band] Reconectando en 5 segundos...")
                await asyncio.sleep(5)

# ─── API pública ──────────────────────────────────────────────────────────────
def iniciar(callback_fc=None, callback_mov=None):
    """
    Inicia la conexión BLE con la Mi Band 8.
    callback_fc(bpm: int) — llamado cada vez que llega una lectura de FC
    callback_mov(nivel: float, estereotipia: bool) — llamado con datos de movimiento
    """
    global _callback_fc, _callback_mov
    _callback_fc  = callback_fc
    _callback_mov = callback_mov

    mac = MIBAND_MAC

    # Ejecutar el loop async en un hilo separado
    import threading
    def run():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_iniciar_async(mac))
        loop.close()

    hilo = threading.Thread(target=run, daemon=True)
    hilo.start()
    print("[Mi Band] Hilo BLE iniciado")

def detener():
    global _corriendo
    _corriendo = False

# ─── Prueba independiente ─────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  SonoData TEA — Test Mi Band BLE")
    print("=" * 50)

    def test_fc(bpm):
        print(f"  ❤️  FC: {bpm} bpm")

    def test_mov(nivel, estereotipia):
        marca = " ⚠️ ESTEREOTIPIA" if estereotipia else ""
        print(f"  🏃 Movimiento: {nivel}%{marca}")

    iniciar(callback_fc=test_fc, callback_mov=test_mov)

    try:
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        detener()
        print("\n[Mi Band] Detenido")
