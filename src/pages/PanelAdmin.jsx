import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { Tv, LogOut, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import SidebarClientes from '../components/admin/SidebarClientes'
import DetalleCliente from '../components/admin/DetalleCliente'
import GestorContenido from '../components/admin/GestorContenido'

export default function PanelAdmin({ session }) {
  const toast = useToast()
  const [clientes, setClientes] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [slides, setSlides] = useState([])
  const [cargandoClientes, setCargandoClientes] = useState(true)
  const [cargandoSlides, setCargandoSlides] = useState(false)

  // Cargar lista completa de clientes
  const cargarClientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clientes_pantalla')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setClientes(data || [])

      // Si no hay seleccionado o si se actualizó el actual
      setClienteSeleccionado((prev) => {
        if (!data || data.length === 0) return null
        if (!prev) return data[0]
        const actualizado = data.find((c) => c.id === prev.id)
        return actualizado || data[0]
      })
    } catch (err) {
      console.error('Error cargando clientes:', err)
      toast.error('Error al conectar con la base de datos de clientes')
    } finally {
      setCargandoClientes(false)
    }
  }, [toast])

  // Cargar diapositivas del cliente seleccionado
  const cargarSlides = useCallback(
    async (clienteId) => {
      if (!clienteId) {
        setSlides([])
        return
      }
      setCargandoSlides(true)
      try {
        const { data, error } = await supabase
          .from('contenido_pantalla')
          .select('*')
          .eq('cliente_id', clienteId)
          .order('orden', { ascending: true })

        if (error) throw error
        setSlides(data || [])
      } catch (err) {
        console.error('Error cargando contenido:', err)
        toast.error('Error al cargar contenido de la pantalla')
      } finally {
        setCargandoSlides(false)
      }
    },
    [toast]
  )

  // Cargar clientes al montar el componente
  useEffect(() => {
    cargarClientes()
  }, [cargarClientes])

  // Cargar slides cuando cambia el cliente seleccionado
  useEffect(() => {
    if (clienteSeleccionado?.id) {
      cargarSlides(clienteSeleccionado.id)
    }
  }, [clienteSeleccionado?.id, cargarSlides])

  // Operación: Crear nuevo cliente
  const handleCrearCliente = async (datosNuevoCliente) => {
    const { data, error } = await supabase
      .from('clientes_pantalla')
      .insert([datosNuevoCliente])
      .select()
      .single()

    if (error) throw error

    await cargarClientes()
    if (data) {
      setClienteSeleccionado(data)
    }
  }

  // Operación: Actualizar información del cliente
  const handleActualizarCliente = async (clienteId, datosActualizados) => {
    const { error } = await supabase
      .from('clientes_pantalla')
      .update(datosActualizados)
      .eq('id', clienteId)

    if (error) throw error

    // Actualizar estado local inmediatamente
    setClienteSeleccionado((prev) => (prev ? { ...prev, ...datosActualizados } : null))
    setClientes((prev) =>
      prev.map((c) => (c.id === clienteId ? { ...c, ...datosActualizados } : c))
    )
  }

  // Operación: Alternar sonido remoto
  const handleAlternarSonido = async (cliente) => {
    const nuevoSonido = !cliente.sonido_activo
    try {
      await handleActualizarCliente(cliente.id, { sonido_activo: nuevoSonido })
      toast.success(
        nuevoSonido
          ? 'Sonido activado remotamente en pantalla'
          : 'Pantalla silenciada remotamente'
      )
    } catch {
      toast.error('Error al alternar sonido')
    }
  }

  // Operación: Alternar suscripción (activo / suspendido)
  const handleAlternarSuscripcion = async (cliente) => {
    const nuevoEstado = cliente.estado_suscripcion === 'activo' ? 'suspendido' : 'activo'
    try {
      await handleActualizarCliente(cliente.id, { estado_suscripcion: nuevoEstado })
      toast.warning(
        nuevoEstado === 'suspendido'
          ? `Servicio pausado para ${cliente.nombre_negocio}`
          : `Servicio reactivado para ${cliente.nombre_negocio}`
      )
    } catch {
      toast.error('Error al actualizar estado de suscripción')
    }
  }

  // Operación: Agregar Slide
  const handleAgregarSlide = async (datosSlide) => {
    const { error } = await supabase.from('contenido_pantalla').insert([datosSlide])
    if (error) throw error
    await cargarSlides(clienteSeleccionado.id)
  }

  // Operación: Actualizar Slide (título, duración, activo, etc.)
  const handleActualizarSlide = async (slideId, cambios) => {
    const { error } = await supabase
      .from('contenido_pantalla')
      .update(cambios)
      .eq('id', slideId)

    if (error) throw error

    // Actualización optimista local
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, ...cambios } : s))
    )
  }

  // Operación: Reordenar dos slides
  const handleReordenarSlides = async (slide1, slide2) => {
    // 1. Actualización optimista inmediata en la UI
    setSlides((prev) => {
      const actualizados = prev.map((s) => {
        if (s.id === slide1.id) return { ...s, orden: slide1.orden }
        if (s.id === slide2.id) return { ...s, orden: slide2.orden }
        return s
      })
      return [...actualizados].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    })

    // 2. Persistir en Supabase
    const { error: err1 } = await supabase
      .from('contenido_pantalla')
      .update({ orden: slide1.orden })
      .eq('id', slide1.id)

    const { error: err2 } = await supabase
      .from('contenido_pantalla')
      .update({ orden: slide2.orden })
      .eq('id', slide2.id)

    if (err1 || err2) {
      await cargarSlides(clienteSeleccionado.id)
      throw new Error('Error al sincronizar orden en la base de datos')
    }
  }

  // Operación: Eliminar Slide
  const handleEliminarSlide = async (slideId) => {
    const { error } = await supabase.from('contenido_pantalla').delete().eq('id', slideId)
    if (error) throw error
    setSlides((prev) => prev.filter((s) => s.id !== slideId))
  }

  // Cerrar sesión
  const handleCerrarSesion = async () => {
    await supabase.auth.signOut()
    toast.info('Sesión cerrada correctamente')
  }

  return (
    <div className="min-h-screen bg-[#0A0D0C] text-neutral-100 flex flex-col font-sans select-none">
      {/* Barra de Navegación Superior Ejecutiva */}
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-800/80 px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo y Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 p-0.5 shadow-md shadow-emerald-950/40">
              <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
                <Tv className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  Kaldirev Display
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  SaaS Core
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Servicio Gestionado de Cartelería Digital para Comercios Locales
              </p>
            </div>
          </div>

          {/* Información del Usuario y Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-neutral-200">
                {session?.user?.email || 'Administrador'}
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1">
                <ShieldCheck className="w-3 h-3" /> Panel Maestro Activo
              </span>
            </div>

            <button
              onClick={handleCerrarSesion}
              className="bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              title="Cerrar sesión segura"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Cuerpo Principal del Dashboard: Layout Escritorio (Sidebar + Contenido) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Sidebar Lateral de Clientes */}
          <SidebarClientes
            clientes={clientes}
            clienteSeleccionado={clienteSeleccionado}
            onSeleccionarCliente={setClienteSeleccionado}
            onCrearCliente={handleCrearCliente}
            cargando={cargandoClientes}
          />

          {/* Área de Trabajo Principal */}
          <section className="flex-1 w-full min-w-0">
            {clienteSeleccionado ? (
              <div>
                {/* Cabecera y Controles del Negocio Seleccionado */}
                <DetalleCliente
                  cliente={clienteSeleccionado}
                  onActualizarCliente={handleActualizarCliente}
                  onAlternarSonido={handleAlternarSonido}
                  onAlternarSuscripcion={handleAlternarSuscripcion}
                />

                {/* Gestor de Diapositivas y Videos */}
                <GestorContenido
                  cliente={clienteSeleccionado}
                  slides={slides}
                  onAgregarSlide={handleAgregarSlide}
                  onEliminarSlide={handleEliminarSlide}
                  onActualizarSlide={handleActualizarSlide}
                  onReordenarSlides={handleReordenarSlides}
                />
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-600">
                  <Tv className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-neutral-200">
                  Ningún negocio seleccionado
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                  Selecciona un cliente del menú lateral izquierdo o registra un nuevo negocio para
                  comenzar a cargar y programar contenido en su pantalla.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer Discreto */}
      <footer className="border-t border-neutral-800/60 py-4 px-6 text-center text-[11px] text-neutral-500">
        Kaldirev Display &bull; Infraestructura de Cartelería Digital Cloud para Pantallas Comerciales
      </footer>
    </div>
  )
}
