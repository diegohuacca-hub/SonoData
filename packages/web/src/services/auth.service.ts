import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  multiFactor,
  TotpMultiFactorGenerator,
  User,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Rol } from '@tea/shared/types';

// ─── Perfil de usuario en Firestore ───────────────────────────────────────────
export interface PerfilUsuario {
  uid: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: Rol;
  instId: string;
  familiaId?: string;      // solo para padres
  alumnosAsignados?: string[]; // para terapeuta y docente
  activo: boolean;
  ultimoAcceso?: Date;
}

// ─── Login principal ───────────────────────────────────────────────────────────
export async function loginConEmail(
  email: string,
  password: string,
): Promise<{ user: User; perfil: PerfilUsuario }> {
  const cred = await signInWithEmailAndPassword(auth, email, password);

  // Registrar último acceso en Firestore
  await setDoc(
    doc(db, 'usuarios', cred.user.uid),
    { ultimoAcceso: serverTimestamp() },
    { merge: true },
  );

  const perfil = await obtenerPerfil(cred.user.uid);
  if (!perfil) throw new Error('Perfil de usuario no encontrado');
  if (!perfil.activo) throw new Error('Cuenta desactivada. Contacta al administrador.');

  return { user: cred.user, perfil };
}

// ─── Obtener perfil del usuario ────────────────────────────────────────────────
export async function obtenerPerfil(uid: string): Promise<PerfilUsuario | null> {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists()) return null;
  return snap.data() as PerfilUsuario;
}

// ─── 2FA con TOTP (Google Authenticator) ──────────────────────────────────────
export async function iniciar2FA(user: User): Promise<string> {
  const mfaUser = multiFactor(user);
  const session = await mfaUser.getSession();
  const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);

  // Retorna la URL para mostrar el QR en la app
  return totpSecret.generateQrCodeUrl(user.email ?? '', 'SensoryTEA');
}

export async function verificar2FA(user: User, codigoTotp: string): Promise<void> {
  const mfaUser = multiFactor(user);
  const session = await mfaUser.getSession();
  const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, codigoTotp);
  await mfaUser.enroll(assertion, 'Google Authenticator');
}

// ─── Escuchar cambios de auth ──────────────────────────────────────────────────
export function escucharAuth(
  callback: (user: User | null, perfil: PerfilUsuario | null) => void,
) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null, null);
    const perfil = await obtenerPerfil(user.uid);
    callback(user, perfil);
  });
}

// ─── Logout ────────────────────────────────────────────────────────────────────
export async function cerrarSesion(): Promise<void> {
  await signOut(auth);
}

// ─── Verificar permisos por rol ────────────────────────────────────────────────
export function puedeAccederAlAlumno(
  perfil: PerfilUsuario,
  alumnoId: string,
): boolean {
  if (perfil.rol === 'admin') return true;
  if (perfil.rol === 'padre') {
    // El padre accede via familiaId, verificado en reglas de Firestore
    return true;
  }
  // Terapeuta y docente deben tener el alumno en su lista asignada
  return perfil.alumnosAsignados?.includes(alumnoId) ?? false;
}
