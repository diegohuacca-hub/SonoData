# 🧠 SonoData TEA

> **Sistema de monitoreo sensorial en tiempo real para niños con Trastorno del Espectro Autista (TEA)**

[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20DB%20%2B%20Firestore-orange?logo=firebase)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/Dashboard-React%20%2B%20TypeScript-61DAFB?logo=react)](https://react.dev/)
[![Android](https://img.shields.io/badge/App-Android%20Kotlin-3DDC84?logo=android)](https://developer.android.com/)
[![Python](https://img.shields.io/badge/Gateway-Python%20%2B%20YAMNet%20%2B%20HSEmotion-3776AB?logo=python)](https://www.python.org/)
[![Galaxy Watch](https://img.shields.io/badge/Wearable-Galaxy%20Watch%208-1428A0?logo=samsung)](https://www.samsung.com/)

---

## 📋 Descripción del Proyecto

SonoData TEA es una plataforma IoT de monitoreo sensorial multimodal diseñada para detectar situaciones de sobrecarga sensorial en niños con TEA. El sistema integra:

- **Galaxy Watch 8** — captura de datos de movimiento (acelerómetro/giroscopio) directamente a Firebase
- **Python Gateway** — clasificación de audio con YAMNet y detección emocional con HSEmotion (ONNX), con motor de fusión multisensor anti-spam
- **Dashboard Web** (React/TypeScript) — visualización en tiempo real con gráficas y alertas
- **App Android** (Kotlin/Jetpack Compose) — monitoreo móvil para cuidadores
- **ESP32 + INMP441** *(en integración)* — captura de audio embebida en tiempo real

### Problemática

Los niños con TEA presentan hipersensibilidad sensorial ante estímulos como ruidos fuertes o movimientos bruscos. La detección temprana de estos episodios permite a cuidadores y terapeutas intervenir oportunamente. SonoData TEA automatiza esta detección mediante IA embebida y conectividad en la nube.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐     ┌──────────────────┐
│  Galaxy Watch 8  │     │   ESP32 + INMP441 │
│  SensorService   │     │   (en integración)│
│  (Kotlin/WearOS) │     │   Firmware C++    │
└────────┬────────┘     └────────┬──────────┘
         │ Firebase SDK           │ Firebase SDK
         ▼                        ▼
┌─────────────────────────────────────────────┐
│         Firebase Realtime Database           │
│   /sensors/{deviceId}/accelerometer         │
│   /sensors/{deviceId}/audio                 │
│   /alerts/{alertId}                         │
└──────────────────┬──────────────────────────┘
                   │ Firebase Admin SDK
                   ▼
┌─────────────────────────────────────────────┐
│           Python Gateway                     │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ YAMNet      │  │ HSEmotion (ONNX)     │  │
│  │ Audio class │  │ Emotion detection    │  │
│  └──────┬──────┘  └──────────┬───────────┘  │
│         └─────────┬──────────┘              │
│         ┌─────────▼──────────┐              │
│         │ Fusion Engine       │              │
│         │ (anti-spam alerts)  │              │
│         └─────────┬──────────┘              │
└───────────────────┼─────────────────────────┘
                    │ Firestore
          ┌─────────┴──────────┐
          ▼                    ▼
┌──────────────────┐  ┌──────────────────────┐
│ Dashboard React   │  │  App Android          │
│ TypeScript/Vite  │  │  Kotlin/Jetpack       │
│ Gráficas + alertas│  │  Compose + Firebase   │
└──────────────────┘  └──────────────────────┘
```

**Flujo de datos:**
1. Galaxy Watch 8 → escribe sensores a Firebase Realtime DB cada 100ms
2. Python Gateway → escucha cambios en Firebase → procesa con YAMNet/HSEmotion → escribe alertas a Firestore
3. Dashboard React y App Android → escuchan Firestore en tiempo real → muestran alertas y gráficas

---

## 📁 Estructura del Repositorio

```
sonodata-tea/
├── 📁 gateway/                    # Python Gateway (IA + Firebase)
│   ├── main.py                    # Punto de entrada del gateway
│   ├── audio_classifier.py        # Clasificación YAMNet
│   ├── emotion_detector.py        # Detección HSEmotion (ONNX)
│   ├── fusion_engine.py           # Motor de fusión + anti-spam
│   ├── firebase_client.py         # Conexión Firebase Admin SDK
│   ├── models/                    # Modelos YAMNet y HSEmotion .onnx
│   └── requirements.txt
│
├── 📁 wearable/                   # Galaxy Watch 8 (Kotlin/WearOS)
│   ├── SensorService.kt           # Servicio de captura y envío a Firebase
│   ├── MainActivity.kt
│   └── build.gradle
│
├── 📁 android-app/                # App Android (Kotlin/Jetpack Compose)
│   ├── app/src/main/
│   │   ├── MainActivity.kt
│   │   ├── ui/                    # Pantallas Jetpack Compose
│   │   └── data/                  # Repositorios Firebase
│   └── build.gradle
│
├── 📁 dashboard/                  # Dashboard React/TypeScript
│   ├── src/
│   │   ├── components/            # Gráficas, alertas, cards
│   │   ├── hooks/                 # useFirebase, useSensorData
│   │   └── pages/
│   ├── package.json
│   └── vite.config.ts
│
├── 📁 firmware/                   # ESP32 + INMP441 (en integración)
│   ├── main.cpp                   # Captura I2S + envío Firebase
│   └── platformio.ini
│
├── 📁 docs/                       # Documentación técnica
│   ├── architecture-diagram.png
│   ├── hardware-schematic.png     # Fritzing ESP32 + INMP441
│   ├── firebase-schema.md         # Estructura de nodos Firebase
│   └── installation-guide.md
│
├── 📁 media/                      # Evidencias multimedia
│   ├── demo-video-link.md         # Link al video de demostración
│   └── screenshots/
│
├── firebase.rules.json            # Reglas de seguridad Realtime DB
├── firestore.rules                # Reglas de seguridad Firestore
├── .env.example                   # Variables de entorno (sin credenciales reales)
├── .gitignore
└── README.md
```

---

## ⚙️ Requisitos

### Hardware
| Componente | Descripción |
|---|---|
| Galaxy Watch 8 | Wearable con WearOS — captura acelerómetro/giroscopio |
| Smartphone Android | Android 10+ para la app de monitoreo (probado en Redmi Note 14) |
| PC/Laptop | Para ejecutar el Python Gateway y el Dashboard |
| ESP32 *(opcional)* | Con módulo INMP441 para captura de audio embebida |

### Software
| Componente | Versión |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| Android Studio | Hedgehog o superior |
| Firebase CLI | 12+ |

---

## 🚀 Instalación y Despliegue

### 1. Clonar el repositorio
```bash
git clone https://github.com/<tu-usuario>/sonodata-tea.git
cd sonodata-tea
```

### 2. Configurar Firebase
1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar **Realtime Database** y **Firestore**
3. Descargar `google-services.json` → copiar a `android-app/app/`
4. Generar clave de servicio (Service Account) → guardar como `gateway/serviceAccountKey.json`
5. Copiar `.env.example` a `.env` y completar con tus credenciales

### 3. Python Gateway
```bash
cd gateway
pip install -r requirements.txt
python main.py
```

### 4. Dashboard React
```bash
cd dashboard
npm install
npm run dev
# Disponible en http://localhost:5173
```

### 5. App Android
1. Abrir `android-app/` en Android Studio
2. Sincronizar Gradle
3. Conectar dispositivo Android (o emulador API 30+)
4. Run → `MainActivity`

### 6. Galaxy Watch 8 (SensorService)
1. Abrir `wearable/` en Android Studio con WearOS SDK instalado
2. Emparejar el Watch con el teléfono de desarrollo
3. Instalar la app en el Watch vía ADB o Android Studio

---

## 🔥 Estructura de Firebase

### Realtime Database
```json
{
  "sensors": {
    "{deviceId}": {
      "accelerometer": {
        "x": 0.12,
        "y": -0.05,
        "z": 9.81,
        "timestamp": 1719500000000
      },
      "audio": {
        "rms": 0.034,
        "timestamp": 1719500000000
      }
    }
  }
}
```

### Firestore — Colección `alerts`
```json
{
  "alertId": {
    "type": "AUDIO_STRESS",
    "level": "HIGH",
    "yamnet_class": "Screaming",
    "emotion": "fear",
    "confidence": 0.87,
    "timestamp": "2025-06-27T15:30:00Z",
    "deviceId": "watch_001"
  }
}
```

---

## 👥 Equipo

| Nombre | Rol |
|---|---|
| Diego Huacca Ccaso | Arquitectura, Python Gateway (YAMNet/HSEmotion), Dashboard React |
| Leo Pinto Garate | Galaxy Watch 8 / SensorService.kt, Firestore |
| Daniel Jacobo Colque | App Android (Kotlin/Jetpack Compose), Documentación|
| Orlando Huacasi Ccopa | Firmware ESP32 + INMP441, Firebase Backend|

---

## 📄 Licencia

Proyecto académico — TECSUP Arequipa, Tecnologías Emergentes, 4to Ciclo — 2025.
