import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { ToastProvider } from './context/ToastContext'
import PantallaTV from './components/tv/PantallaTV'
import LoginAdmin from './pages/LoginAdmin'
import PanelAdmin from './pages/PanelAdmin'
import { Tv, Loader2 } from 'lucide-react'

export default function App() {
  const [params] = useState(() => new URLSearchParams(window.location.search))
  const tvClientId = params.get('tv')

  // 1. Vista Pública de Pantalla de Televisor (?tv=CLIENT_ID)
  // No requiere sesión ni contenedor de administración
  if (tvClientId) {
    return <PantallaTV clientId={tvClientId} />
  }

  // 2. Experiencia de Administración Privada (Desktop SaaS Dashboard)
  return (
    <ToastProvider>
      <ContenedorAdmin />
    </ToastProvider>
  )
}

function ContenedorAdmin() {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // 1. Obtener sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCargando(false)
    })

    // 2. Escuchar cambios de autenticación en tiempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Estado de carga inicial con spinner limpio
  if (cargando) {
    return (
      <div className="min-h-screen bg-[#0A0D0C] text-neutral-400 flex flex-col items-center justify-center p-6 select-none">
        <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
          <Tv className="w-6 h-6 text-emerald-400 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Verificando credenciales de acceso...</span>
        </div>
      </div>
    )
  }

  // Si no está autenticado, mostrar formulario de login
  if (!session) {
    return <LoginAdmin />
  }

  // Si está autenticado, mostrar panel de administración completo
  return <PanelAdmin session={session} />
}
