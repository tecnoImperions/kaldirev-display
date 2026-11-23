import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Tv, Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'
import { useToast } from '../context/ToastContext'

export default function LoginAdmin() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    setEnviando(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Credenciales incorrectas. Verifica tu correo y contraseña.')
        } else {
          setError(authError.message || 'Error al iniciar sesión.')
        }
        toast.error('No se pudo iniciar sesión')
      } else {
        toast.success('¡Bienvenido al Panel de Kaldirev Display!')
      }
    } catch (err) {
      console.error(err)
      setError('Error inesperado de conexión.')
      toast.error('Error de conexión con el servidor')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0A0D0C] text-neutral-100 flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Luces y ambientación de fondo */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/5 rounded-full blur-[130px] pointer-events-none" />

      {/* Contenedor de Login */}
      <div className="w-full max-w-md bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 lg:p-10 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Cabecera / Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 p-0.5 shadow-lg shadow-emerald-950/50 mb-4">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
              <Tv className="w-7 h-7 text-emerald-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Kaldirev Display
          </h1>
          <p className="text-xs text-neutral-400 mt-1.5 max-w-xs">
            Plataforma Profesional de Gestión de Cartelería Digital para Negocios
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acceso Privado para Administradores</span>
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 text-center font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kaldirev.com"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-neutral-300">Contraseña</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={mostrarPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-semibold text-xs py-3 rounded-xl shadow-lg shadow-emerald-950/50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            {enviando ? (
              <span>Autenticando credenciales...</span>
            ) : (
              <>
                <span>Ingresar al Panel de Control</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Pie del formulario */}
        <div className="mt-8 pt-6 border-t border-neutral-800/80 text-center">
          <p className="text-[11px] text-neutral-500">
            Kaldirev Display &bull; Gestión centralizada para pantallas de negocios
          </p>
        </div>
      </div>
    </div>
  )
}
