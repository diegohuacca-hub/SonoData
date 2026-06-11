import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// 🔥 Configuración directa (sin .env para evitar errores)
const firebaseConfig = {
  apiKey: "AIzaSyAVgKsiTWEnjHaII53CAXKYZLi4XeQL6Ts",
  authDomain: "sonodata-543f4.firebaseapp.com",
  databaseURL: "https://sonodata-543f4-default-rtdb.firebaseio.com",
  projectId: "sonodata-543f4",
  storageBucket: "sonodata-543f4.appspot.com",
  messagingSenderId: "689607873433",
  appId: "1:689607873433:web:def43964a222874f613908",
};

// 🔥 Evita doble inicialización (MUY IMPORTANTE)
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// 🔥 Servicios Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const fn = getFunctions(app, "us-central1");
export const storage = getStorage(app);

export default app;