import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { esVideo } from '../../utils/helpers'
import { Volume2, AlertTriangle, Tv, ShieldAlert } from 'lucide-react'

export default function PantallaTV({ clientId }) {
  const [cliente, setCliente] = useState(null)
  const [slides, setSlides] = useState([])
  const [indice, setIndice] = useState(0)
  const [audioBloqueado, setAudioBloqueado] = useState(false)
  const [desvaneciendo, setDesvaneciendo] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(false)

  // Referencias para video y timers
  const videoRef = useRef(null)
  const cursorTimerRef = useRef(null)
  const slidesEnMemoriaRef = useRef([])

  // Sincronizar referencia de slides para resiliencia ante cortes de red
  useEffect(() => {
    slidesEnMemoriaRef.current = slides
  }, [slides])

  // Carga de datos inicial y reactiva con tolerancia a fallos
  const cargarDatos = useCallback(async () => {
    try {
      // 1. Obtener cliente
      const { data: c, error: errCliente } = await supabase
        .from('clientes_pantalla')
        .select('*')
        .eq('id', clientId)
        .single()

      if (!errCliente && c) {
        setCliente(c)
      }

      // 2. Obtener diapositivas activas ordenadas
      const { data: s, error: errSlides } = await supabase
        .from('contenido_pantalla')
        .select('*')
        .eq('cliente_id', clientId)
        .eq('activo', true)
        .order('orden', { ascending: true })

      if (!errSlides && s) {
        setSlides(s)
        // Si el índice actual excede la nueva longitud, reiniciar a 0
        setIndice((prev) => (s.length > 0 && prev >= s.length ? 0 : prev))
      }
    } catch (err) {
      console.warn('Micro-corte o error de red en TV. Manteniendo contenido en memoria:', err)
      // Resiliencia: si falla la petición, no destruye los slides ya en memoria
    }
  }, [clientId])

  // Suscripción en Tiempo Real con Supabase Realtime
  useEffect(() => {
    cargarDatos()

    const canal = supabase
      .channel(`tv-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes_pantalla',
          filter: `id=eq.${clientId}`,
        },
        (payload) => {
          if (payload.new) {
            setCliente((prev) => ({ ...prev, ...payload.new }))
          } else {
            cargarDatos()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contenido_pantalla',
          filter: `cliente_id=eq.${clientId}`,
        },
        () => {
          cargarDatos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [clientId, cargarDatos])

  // Función para avanzar a la siguiente diapositiva con transición suave
  const siguienteSlide = useCallback(() => {
    const total = slidesEnMemoriaRef.current.length
    if (total <= 1) return

    setDesvaneciendo(true)
    setTimeout(() => {
      setIndice((prev) => (prev + 1) % total)
      setDesvaneciendo(false)
    }, 400)
  }, [])

  // Timer para avanzar imágenes según duracion_segundos
  useEffect(() => {
    if (!slides.length || cliente?.estado_suscripcion !== 'activo') return
    const actual = slides[indice]
    if (!actual || esVideo(actual.url_imagen)) return

    const duracionMs = Math.max((actual.duracion_segundos || 6) * 1000, 2000)
    const timer = setTimeout(siguienteSlide, duracionMs)

    return () => clearTimeout(timer)
  }, [indice, slides, cliente?.estado_suscripcion, siguienteSlide])

  // Precargar la siguiente imagen para evitar parpadeos
  useEffect(() => {
    if (slides.length > 1) {
      const siguienteIndex = (indice + 1) % slides.length
      const siguiente = slides[siguienteIndex]
      if (siguiente && !esVideo(siguiente.url_imagen)) {
        const img = new Image()
        img.src = siguiente.url_imagen
      }
    }
  }, [indice, slides])

  // Desbloqueo de audio interactivo (Smart TV Remoto / Clic)
  const desbloquearAudio = useCallback(() => {
    const vid = videoRef.current
    if (vid) {
      vid.muted = false
      vid.play().catch(() => {})
    }
    setAudioBloqueado(false)
  }, [])

  // Escuchar cualquier tecla del control remoto de la Smart TV o teclado
  useEffect(() => {
    const handleKeydown = (e) => {
      // Cualquier tecla del mando (Enter, Space, Flechas, Teclado numérico, etc.)
      if (audioBloqueado) {
        desbloquearAudio()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [audioBloqueado, desbloquearAudio])

  // Control de reproducción de video y políticas de Autoplay del navegador
  useEffect(() => {
    const vid = videoRef.current
    if (!vid || !cliente) return

    const quiereSonido = Boolean(cliente.sonido_activo)

    if (!quiereSonido) {
      vid.muted = true
      vid.play().catch(() => {})
      setAudioBloqueado(false)
      return
    }

    // Quiere sonido: intentar reproducir desmuteado
    vid.muted = false
    vid.play()
      .then(() => {
        setAudioBloqueado(false)
      })
      .catch((err) => {
        console.warn('Autoplay con audio restringido por navegador. Iniciando silenciado...', err)
        // Fallback para evitar congelar pantalla: reproducir silenciado y avisar para presionar OK
        vid.muted = true
        vid.play().catch(() => {})
        setAudioBloqueado(true)
      })
  }, [indice, slides, cliente?.sonido_activo])

  // Ocultar cursor de ratón en Smart TV tras 2.5s de inactividad
  const handleMouseMove = () => {
    setCursorVisible(true)
    if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current)
    cursorTimerRef.current = setTimeout(() => {
      setCursorVisible(false)
    }, 2500)
  }

  // ==========================================
  // PANTALLAS DE ESTADO
  // ==========================================

  // Estado 1: Conectando / Cargando
  if (!cliente && slides.length === 0) {
    return (
      <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center p-8 select-none">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center animate-pulse">
            <Tv className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Kaldirev Display</h1>
        <p className="text-sm text-neutral-500 mt-2">Conectando pantalla digital inteligente...</p>
      </div>
    )
  }

  // Estado 2: Servicio Pausado / Suspendido
  if (cliente?.estado_suscripcion === 'suspendido') {
    return (
      <div className="h-screen w-screen bg-[#0A0D0C] text-white flex flex-col items-center justify-center p-12 text-center select-none overflow-hidden relative">
        {/* Glow de fondo */}
        <div className="absolute w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[140px] pointer-events-none" />

        <div className="border border-amber-500/30 bg-neutral-900/90 backdrop-blur-xl px-12 py-14 rounded-3xl max-w-2xl shadow-2xl relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          </div>

          <span className="inline-block text-xs uppercase tracking-widest text-amber-400 font-semibold mb-2 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
            Aviso de Suscripción
          </span>

          <h1 className="text-3xl font-extrabold text-neutral-100 mb-4 tracking-tight">
            Servicio de Cartelería Pausado
          </h1>

          <p className="text-neutral-300 text-lg leading-relaxed mb-6">
            La pantalla digital asignada a{' '}
            <span className="font-bold text-white underline decoration-amber-500/50 underline-offset-4">
              {cliente.nombre_negocio}
            </span>{' '}
            requiere renovación de suscripción para reanudar la emisión.
          </p>

          <div className="border-t border-neutral-800 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Kaldirev Display • Digital Signage</span>
            </div>
            <span>Atención al Cliente: Soporte Técnico Directo</span>
          </div>
        </div>
      </div>
    )
  }

  // Estado 3: Sin diapositivas activas cargadas
  if (slides.length === 0) {
    return (
      <div className="h-screen w-screen bg-[#0A0D0C] text-neutral-400 flex flex-col items-center justify-center p-8 select-none">
        <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4 text-emerald-400">
          <Tv className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-neutral-200">{cliente?.nombre_negocio}</h2>
        <p className="text-sm text-neutral-500 mt-2">
          Pantalla activa y en espera de promociones desde el panel.
        </p>
      </div>
    )
  }

  const slideActual = slides[indice] || slides[0]
  const esSlideVideo = esVideo(slideActual?.url_imagen)

  return (
    <div
      onMouseMove={handleMouseMove}
      onClick={audioBloqueado ? desbloquearAudio : undefined}
      className={`h-screen w-screen bg-black overflow-hidden relative select-none ${
        cursorVisible ? 'cursor-default' : 'cursor-none'
      }`}
    >
      {/* Reproductor de Video */}
      {esSlideVideo ? (
        <video
          ref={videoRef}
          key={`video-${slideActual.id}`}
          src={slideActual.url_imagen}
          autoPlay
          muted={!cliente.sonido_activo}
          playsInline
          loop={slides.length === 1}
          onEnded={siguienteSlide}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            desvaneciendo ? 'opacity-0' : 'opacity-100'
          }`}
        />
      ) : (
        /* Visualizador de Imagen con Transición Fade */
        <img
          key={`img-${slideActual.id}`}
          src={slideActual.url_imagen}
          alt={slideActual.titulo || 'Promoción Kaldirev Display'}
          className={`w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
            desvaneciendo ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}

      {/* Título de la promoción (si está configurado) */}
      {slideActual.titulo && (
        <div className="absolute bottom-8 left-8 max-w-3xl bg-black/75 backdrop-blur-xl text-white px-7 py-3.5 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in duration-500">
          <p className="text-2xl lg:text-3xl font-extrabold tracking-wide drop-shadow-md">
            {slideActual.titulo}
          </p>
        </div>
      )}

      {/* Notificación de audio bloqueado por políticas de navegador */}
      {esSlideVideo && cliente.sonido_activo && audioBloqueado && (
        <button
          autoFocus
          onClick={desbloquearAudio}
          className="absolute top-6 left-6 z-30 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 cursor-pointer animate-pulse border border-emerald-400/40"
        >
          <Volume2 className="w-5 h-5 text-white" />
          <span>Presiona OK o haz clic para activar sonido</span>
        </button>
      )}

      {/* Marca de agua discreta de Kaldirev Display en esquina superior */}
      <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-md text-white/50 text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full border border-white/5">
        Kaldirev Display
      </div>
    </div>
  )
}
