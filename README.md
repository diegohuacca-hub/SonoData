# SensoryTEA — Sistema de monitoreo para niños con TEA

Plataforma web + móvil para el seguimiento de actividades, bienestar sensorial
y comunicación de niños con Trastorno del Espectro Autista (4–13 años).

## Estructura del monorepo

```
tea-app/
├── packages/
│   ├── web/              # React + TypeScript (PWA)
│   │   └── src/
│   │       ├── pages/        # auth/ padre/ terapeuta/ docente/ admin/
│   │       ├── components/   # ui/ dashboard/ bitacora/ sensorial/ alertas/
│   │       ├── hooks/        # useAuth, useAlumno, useBitacora, useSensores
│   │       ├── services/     # firebase.ts auth bitacora sensorial alertas
│   │       ├── store/        # Zustand store global
│   │       └── types/        # Re-exporta desde @tea/shared
│   │
│   ├── mobile/           # React Native + Expo (iOS + Android)
│   │   └── src/
│   │       ├── screens/      # Mismas vistas que web, adaptadas a móvil
│   │       ├── navigation/   # Stack + Tab navigators por rol
│   │       └── services/     # Comparte servicios con web via @tea/shared
│   │
│   ├── functions/        # Firebase Cloud Functions (Node.js)
│   │   └── src/
│   │       └── index.ts      # procesarLecturaSensor, generarReporteSemanal
│   │
│   ├── gateway/          # Agente local en tablet Android
│   │   └── src/
│   │       ├── audio_pipeline.py   # YAMNet + clasificación local
│   │       └── ble_bridge.js       # noble BLE → Firebase
│   │
│   └── shared/           # Tipos y utilidades compartidas
│       └── src/
│           ├── types/        # Todas las interfaces TypeScript
│           ├── utils/        # Helpers compartidos
│           └── constants/    # Constantes del dominio
│
├── firestore.rules       # Reglas de seguridad server-side
├── firestore.indexes.json
├── firebase.json
└── package.json          # Monorepo root (npm workspaces)
```

## Stack tecnológico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Web | React 18 + TypeScript + Vite | PWA instalable, ecosistema maduro |
| Móvil | React Native + Expo | iOS + Android desde un codebase |
| Backend | Firebase Cloud Functions (Node.js) | Serverless, sin ops, escala automático |
| Base de datos | Firestore + Realtime DB | Historial + stream live de sensores |
| Autenticación | Firebase Auth + 2FA TOTP | JWT, invitaciones, biometría móvil |
| Push | Firebase Cloud Messaging | iOS + Android + web desde un SDK |
| Almacenamiento | Firebase Storage | PDFs, adjuntos con URLs firmadas |
| IA de audio | Python + YAMNet (local) | 521 clases, corre sin internet |
| Gateway BLE | Node.js + noble | Wearable → Firebase via HTTPS |
| Estado global | Zustand | Ligero, sin boilerplate |
| Estilos | TailwindCSS | Utilitario, consistente, responsive |

## Configuración inicial

### 1. Prerrequisitos

```bash
node >= 18
npm >= 9
python >= 3.10  (solo para el gateway)
```

### 2. Instalar dependencias

```bash
# Desde la raíz del monorepo
npm install

# Para el gateway Python
cd packages/gateway
pip install tensorflow tensorflow-hub sounddevice numpy requests
```

### 3. Configurar Firebase

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Activar: Authentication, Firestore, Realtime Database, Storage, Functions, FCM
3. Copiar las credenciales en los archivos `.env`:

```bash
# packages/web/.env.local
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Desplegar reglas de Firestore

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### 5. Iniciar en desarrollo

```bash
# Web (http://localhost:5173)
npm run web

# Emuladores de Firebase (recomendado para desarrollo)
firebase emulators:start

# Gateway (en la tablet)
cd packages/gateway
TEA_ALUMNO_ID=alumno_001 TEA_FAMILIA_ID=fam_001 \
TEA_GATEWAY_TOKEN=token python src/audio_pipeline.py
```

## Seguridad y privacidad

- Audio procesado 100% localmente (YAMNet en tablet) — nunca viaja a la nube
- Datos cifrados AES-256 en reposo (Firebase nativo)
- TLS 1.3 en tránsito
- Reglas Firestore server-side — imposible saltarlas desde el cliente
- Aislamiento por `familia_id` — cada familia vive en su universo
- Log de auditoría inmutable para cada acceso
- Cumplimiento Ley N° 29733 (Perú) — consentimiento + derecho al olvido

## Fases de desarrollo

| Fase | Módulos | Estimado |
|------|---------|----------|
| 1 | Auth, roles, Firestore, reglas de seguridad | 2 semanas |
| 2 | Dashboard padre, bitácora, alertas | 3 semanas |
| 3 | Sesión terapéutica, mapa sensorial | 2 semanas |
| 4 | Gateway, sensores, YAMNet, BLE | 3 semanas |
| 5 | Reportes PDF, app móvil, notificaciones | 2 semanas |

**Total estimado piloto:** 12 semanas (3 meses)

## Piloto: 20 alumnos

Costo mensual en Firebase (plan Spark gratuito):
- Firestore: 1GB almacenamiento ✓
- Realtime DB: 1GB datos ✓
- Functions: 125K invocaciones/mes ✓
- Hosting: 10GB/mes ✓
- FCM: ilimitado ✓

**Costo total infraestructura fase piloto: $0/mes**
