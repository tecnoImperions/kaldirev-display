import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { Tv, Plus, Trash2, Power, ExternalLink, Image as ImageIcon, Video, Upload, Lock, LogOut, Volume2, VolumeX } from 'lucide-react'

const esVideo = (url) => {
  if (!url) return false
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || url.includes('/video/upload/')
}

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const tvClientId = params.get('tv')

  if (tvClientId) {
    return <PantallaTV clientId={tvClientId} />
  }

  return <ContenedorAdmin />
}

// ==========================================
// CONTROLADOR DE SESIÓN PARA EL ADMIN
// ==========================================
function ContenedorAdmin() {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (cargando) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center">
        Verificando acceso...
      </div>
    )
  }

  if (!session) {
    return <LoginAdmin />
  }

  return <PanelAdmin session={session} />
}

// ==========================================
// PANTALLA DE LOGIN PRIVADO
// ==========================================
function LoginAdmin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const iniciarSesion = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos.')
    }
    setEnviando(false)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <form
        onSubmit={iniciarSesion}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-5"
      >
        <div className="flex flex-col items-center text-center">
          <div className="bg-emerald-600/20 border border-emerald-500/40 p-3 rounded-2xl mb-3">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold">Kaldirev Display</h1>
          <p className="text-xs text-neutral-400 mt-1">Acceso exclusivo de administración</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs p-3 rounded-lg text-center">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Correo electrónico</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@kaldirev.com"
            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          disabled={enviando}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition"
        >
          {enviando ? 'Ingresando...' : 'Entrar al Panel'}
        </button>
      </form>
    </div>
  )
}

// ==========================================
// 1. VISTA PANTALLA DE TELEVISOR (?tv=ID)
// ==========================================
function PantallaTV({ clientId }) {
  const [cliente, setCliente] = useState(null)
  const [slides, setSlides] = useState([])
  const [indice, setIndice] = useState(0)
  const [audioBloqueado, setAudioBloqueado] = useState(false)
  const videoRef = useRef(null)

  const cargarDatos = async () => {
    const { data: c } = await supabase
      .from('clientes_pantalla')
      .select('*')
      .eq('id', clientId)
      .single()
    setCliente(c)

    const { data: s } = await supabase
      .from('contenido_pantalla')
      .select('*')
      .eq('cliente_id', clientId)
      .eq('activo', true)
      .order('orden', { ascending: true })
    setSlides(s || [])
    setIndice(0)
  }

  useEffect(() => {
    cargarDatos()

    const canal = supabase
      .channel('tv-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes_pantalla' }, cargarDatos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contenido_pantalla' }, cargarDatos)
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [clientId])

  const siguienteSlide = () => {
    setIndice((prev) => (prev + 1) % slides.length)
  }

  useEffect(() => {
    if (!slides.length || cliente?.estado_suscripcion !== 'activo') return
    const actual = slides[indice]
    if (esVideo(actual?.url_imagen)) return

    const duracion = (actual?.duracion_segundos || 6) * 1000
    const timer = setTimeout(siguienteSlide, duracion)
    return () => clearTimeout(timer)
  }, [indice, slides, cliente])

  // Manejo inteligente de audio y políticas de autoplay del navegador
  useEffect(() => {
    const vid = videoRef.current
    if (!vid || !cliente) return

    const quiereSonido = Boolean(cliente.sonido_activo)
    vid.muted = !quiereSonido

    vid.play()
      .then(() => {
        setAudioBloqueado(false)
      })
      .catch(() => {
        // Si el navegador bloquea el autoplay con sonido, arranca en silencio y muestra aviso de desbloqueo
        if (quiereSonido) {
          vid.muted = true
          vid.play().catch(() => {})
          setAudioBloqueado(true)
        }
      })
  }, [indice, slides, cliente?.sonido_activo])

  const desbloquearAudio = () => {
    const vid = videoRef.current
    if (vid) {
      vid.muted = false
      vid.play().catch(() => {})
    }
    setAudioBloqueado(false)
  }

  if (!cliente) {
    return (
      <div className="h-screen w-screen bg-neutral-950 text-white flex items-center justify-center text-2xl">
        Conectando con Kaldirev Display...
      </div>
    )
  }

  if (cliente.estado_suscripcion === 'suspendido') {
    return (
      <div className="h-screen w-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-10 text-center">
        <div className="border border-amber-500/40 bg-amber-500/10 px-8 py-10 rounded-2xl max-w-xl">
          <h1 className="text-3xl font-bold text-amber-400 mb-3">Servicio Pausado</h1>
          <p className="text-neutral-300 text-lg">
            La suscripción de pantalla digital de{' '}
            <span className="font-semibold text-white">{cliente.nombre_negocio}</span> requiere renovación.
          </p>
          <p className="text-sm text-neutral-500 mt-6">Soporte Kaldirev Display • Santa Cruz</p>
        </div>
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className="h-screen w-screen bg-neutral-950 text-neutral-400 flex items-center justify-center text-xl">
        Sin promociones cargadas para {cliente.nombre_negocio}
      </div>
    )
  }

  const actual = slides[indice]
  const actualEsVideo = esVideo(actual.url_imagen)

  return (
    <div
      onClick={audioBloqueado ? desbloquearAudio : undefined}
      className="h-screen w-screen bg-black overflow-hidden relative select-none"
    >
      {actualEsVideo ? (
        <video
          ref={videoRef}
          key={actual.id}
          src={actual.url_imagen}
          autoPlay
          muted={!cliente.sonido_activo}
          playsInline
          loop={slides.length === 1}
          onEnded={siguienteSlide}
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          key={actual.id}
          src={actual.url_imagen}
          alt={actual.titulo}
          className="w-full h-full object-cover transition-opacity duration-700"
        />
      )}

      {actualEsVideo && cliente.sonido_activo && audioBloqueado && (
        <button
          onClick={desbloquearAudio}
          className="absolute top-6 left-6 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg flex items-center gap-2 cursor-pointer animate-pulse"
        >
          <Volume2 className="w-4 h-4" /> Presiona OK para activar sonido
        </button>
      )}

      {actual.titulo && (
        <div className="absolute bottom-8 left-8 bg-black/70 backdrop-blur-md text-white px-6 py-3 rounded-xl border border-white/10">
          <p className="text-2xl font-bold tracking-wide">{actual.titulo}</p>
        </div>
      )}
      <div className="absolute top-6 right-6 bg-black/50 text-white/70 text-xs px-3 py-1 rounded-full">
        Kaldirev Display
      </div>
    </div>
  )
}

// ==========================================
// 2. PANEL ADMINISTRADOR PROTEGIDO
// ==========================================
function PanelAdmin({ session }) {
  const [clientes, setClientes] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [slides, setSlides] = useState([])
  const [nuevoNegocio, setNuevoNegocio] = useState('')
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevaUrl, setNuevaUrl] = useState('')
  const [duracion, setDuracion] = useState(6)
  const [subiendo, setSubiendo] = useState(false)

  const cargarClientes = async () => {
    const { data } = await supabase
      .from('clientes_pantalla')
      .select('*')
      .order('created_at', { ascending: false })
    setClientes(data || [])
    if (data?.length && !seleccionado) {
      setSeleccionado(data[0])
    } else if (seleccionado) {
      const actualizado = data?.find((c) => c.id === seleccionado.id)
      if (actualizado) setSeleccionado(actualizado)
    }
  }

  const cargarSlides = async (clienteId) => {
    if (!clienteId) return
    const { data } = await supabase
      .from('contenido_pantalla')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('orden', { ascending: true })
    setSlides(data || [])
  }

  useEffect(() => {
    cargarClientes()
  }, [])

  useEffect(() => {
    if (seleccionado) cargarSlides(seleccionado.id)
  }, [seleccionado?.id])

  const crearNegocio = async (e) => {
    e.preventDefault()
    if (!nuevoNegocio.trim()) return
    await supabase.from('clientes_pantalla').insert([{ nombre_negocio: nuevoNegocio, sonido_activo: false }])
    setNuevoNegocio('')
    cargarClientes()
  }

  const alternarSuscripcion = async (cliente) => {
    const nuevoEstado = cliente.estado_suscripcion === 'activo' ? 'suspendido' : 'activo'
    await supabase
      .from('clientes_pantalla')
      .update({ estado_suscripcion: nuevoEstado })
      .eq('id', cliente.id)
    cargarClientes()
  }

  const alternarSonido = async (cliente) => {
    const nuevoSonido = !cliente.sonido_activo
    await supabase
      .from('clientes_pantalla')
      .update({ sonido_activo: nuevoSonido })
      .eq('id', cliente.id)
    cargarClientes()
  }

  const subirArchivoCloudinary = async (e) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
      alert('Faltan VITE_CLOUDINARY_CLOUD_NAME o VITE_CLOUDINARY_UPLOAD_PRESET en el archivo .env')
      return
    }

    setSubiendo(true)
    const formData = new FormData()
    formData.append('file', archivo)
    formData.append('upload_preset', uploadPreset)

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: 'POST', body: formData }
      )
      const data = await res.json()
      if (data.secure_url) {
        const urlOptimizada = data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/')
        setNuevaUrl(urlOptimizada)
      } else {
        alert('Error al subir archivo: ' + (data.error?.message || 'Revisa tu Upload Preset'))
      }
    } catch (err) {
      console.error('Error subiendo a Cloudinary:', err)
      alert('No se pudo conectar con Cloudinary.')
    } finally {
      setSubiendo(false)
      e.target.value = ''
    }
  }

  const agregarSlide = async (e) => {
    e.preventDefault()
    if (!nuevaUrl.trim() || !seleccionado) return
    await supabase.from('contenido_pantalla').insert([
      {
        cliente_id: seleccionado.id,
        titulo: nuevoTitulo,
        url_imagen: nuevaUrl,
        duracion_segundos: Number(duracion) || 6,
        orden: slides.length + 1,
      },
    ])
    setNuevoTitulo('')
    setNuevaUrl('')
    cargarSlides(seleccionado.id)
  }

  const eliminarSlide = async (id) => {
    await supabase.from('contenido_pantalla').delete().eq('id', id)
    cargarSlides(seleccionado.id)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-xl">
              <Tv className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Kaldirev Display</h1>
              <p className="text-sm text-neutral-400">Panel de Control • {session.user.email}</p>
            </div>
          </div>

          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Columna Izquierda: Lista de Negocios */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h2 className="font-semibold text-lg mb-4">Negocios Activos</h2>
            <form onSubmit={crearNegocio} className="flex gap-2 mb-5">
              <input
                type="text"
                placeholder="Ej: Barbería El Rey"
                value={nuevoNegocio}
                onChange={(e) => setNuevoNegocio(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              />
              <button className="bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 cursor-pointer">
                <Plus className="w-4 h-4" /> Crear
              </button>
            </form>

            <div className="space-y-2">
              {clientes.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSeleccionado(c)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    seleccionado?.id === c.id
                      ? 'bg-emerald-950/40 border-emerald-500/60'
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{c.nombre_negocio}</span>
                    <div className="flex items-center gap-1.5">
                      {c.sonido_activo ? (
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" title="Sonido activado" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5 text-neutral-500" title="Silenciado" />
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.estado_suscripcion === 'activo'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {c.estado_suscripcion === 'activo' ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Gestión de Contenido y Link del TV */}
          <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            {seleccionado ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5 mb-6">
                  <div>
                    <h2 className="text-xl font-bold">{seleccionado.nombre_negocio}</h2>
                    <p className="text-xs text-neutral-400 mt-1">
                      URL del Televisor: <code className="text-emerald-400">{window.location.origin}/?tv={seleccionado.id}</code>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => alternarSonido(seleccionado)}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer border ${
                        seleccionado.sonido_activo
                          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30'
                          : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                      }`}
                    >
                      {seleccionado.sonido_activo ? (
                        <>
                          <Volume2 className="w-4 h-4" /> Sonido: ON
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-4 h-4" /> Sonido: OFF
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => alternarSuscripcion(seleccionado)}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer ${
                        seleccionado.estado_suscripcion === 'activo'
                          ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40 hover:bg-amber-600/30'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                      {seleccionado.estado_suscripcion === 'activo' ? 'Pausar servicio' : 'Reactivar'}
                    </button>

                    <a
                      href={`/?tv=${seleccionado.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-neutral-800 hover:bg-neutral-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> Abrir TV
                    </a>
                  </div>
                </div>

                {/* Formulario agregar imagen o video */}
                <form
                  onSubmit={agregarSlide}
                  className="space-y-3 mb-6 bg-neutral-950 p-4 rounded-xl border border-neutral-800"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Título (opcional)"
                      value={nuevoTitulo}
                      onChange={(e) => setNuevoTitulo(e.target.value)}
                      className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <div className="sm:col-span-2 flex gap-2">
                      <input
                        type="url"
                        required
                        placeholder="Sube imagen/video o pega URL..."
                        value={nuevaUrl}
                        onChange={(e) => setNuevaUrl(e.target.value)}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <label className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-2 rounded-lg text-sm cursor-pointer flex items-center gap-1.5 border border-neutral-700 shrink-0">
                        <Upload className="w-4 h-4 text-emerald-400" />
                        <span>{subiendo ? 'Subiendo...' : 'Subir'}</span>
                        <input
                          type="file"
                          accept="image/*,video/mp4,video/webm"
                          onChange={subirArchivoCloudinary}
                          disabled={subiendo}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span>Duración (solo imágenes):</span>
                      <input
                        type="number"
                        min="2"
                        max="60"
                        value={duracion}
                        onChange={(e) => setDuracion(e.target.value)}
                        className="w-16 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-sm text-center text-white"
                      />
                      <span>segundos</span>
                    </div>

                    <button
                      disabled={subiendo || !nuevaUrl}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2 rounded-lg text-sm font-medium cursor-pointer"
                    >
                      Agregar a Pantalla
                    </button>
                  </div>
                </form>

                {/* Lista de diapositivas y videos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {slides.map((s) => (
                    <div key={s.id} className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
                      {esVideo(s.url_imagen) ? (
                        <video src={s.url_imagen} muted loop autoPlay playsInline className="h-36 w-full object-cover" />
                      ) : (
                        <img src={s.url_imagen} alt={s.titulo} className="h-36 w-full object-cover" />
                      )}
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{s.titulo || 'Sin título'}</p>
                          <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                            {esVideo(s.url_imagen) ? (
                              <>
                                <Video className="w-3 h-3 text-emerald-400" /> Video MP4 (auto)
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-3 h-3" /> {s.duracion_segundos} seg.
                              </>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => eliminarSlide(s.id)}
                          className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-neutral-400">Crea o selecciona un negocio a la izquierda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}