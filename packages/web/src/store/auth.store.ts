import { create } from 'zustand'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'

export type Rol = 'padre' | 'terapeuta' | 'docente' | 'admin'

export interface UsuarioApp {
  uid: string
  email: string
  nombre: string
  apellidos: string
  rol: Rol
  instId: string
  familiaId?: string
  alumnosAsignados?: string[]
  activo: boolean
}

interface AuthState {
  usuario: UsuarioApp | null
  cargando: boolean
  error: string | null
  setUsuario: (u: UsuarioApp | null) => void
  setCargando: (v: boolean) => void
  setError: (e: string | null) => void
  iniciarEscucha: () => () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  cargando: true,
  error: null,

  setUsuario:  (u) => set({ usuario: u }),
  setCargando: (v) => set({ cargando: v }),
  setError:    (e) => set({ error: e }),

  // Escucha cambios de autenticación de Firebase en tiempo real
  iniciarEscucha: () => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        set({ usuario: null, cargando: false })
        return
      }

      try {
        const snap = await getDoc(doc(db, 'usuarios', firebaseUser.uid))
        if (snap.exists()) {
          set({ usuario: snap.data() as UsuarioApp, cargando: false })
        } else {
          // Usuario autenticado pero sin perfil en Firestore
          set({ usuario: null, cargando: false, error: 'Perfil no encontrado' })
        }
      } catch (e) {
        set({ usuario: null, cargando: false, error: 'Error al cargar perfil' })
      }
    })

    return unsub  // función para cancelar la suscripción
  },
}))
