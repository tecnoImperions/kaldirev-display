import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Volume2,
  VolumeX,
  Calendar,
  Phone,
  Building2,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { calcularEstadoVencimiento, obtenerFechaFutura } from '../../utils/helpers'
import { useToast } from '../../context/ToastContext'

export default function SidebarClientes({
  clientes,
  clienteSeleccionado,
  onSeleccionarCliente,
  onCrearCliente,
  cargando,
}) {
  const toast = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Campos de formulario para nuevo cliente
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [telefonoContacto, setTelefonoContacto] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState(obtenerFechaFutura(30))

  // Filtrado reactivo de clientes
  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return clientes
    const query = busqueda.toLowerCase().trim()
    return clientes.filter(
      (c) =>
        c.nombre_negocio?.toLowerCase().includes(query) ||
        c.telefono_contacto?.toLowerCase().includes(query)
    )
  }, [clientes, busqueda])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nombreNegocio.trim()) {
      toast.warning('Por favor ingresa el nombre del negocio')
      return
    }

    setGuardando(true)
    try {
      await onCrearCliente({
        nombre_negocio: nombreNegocio.trim(),
        telefono_contacto: telefonoContacto.trim() || null,
        fecha_vencimiento: fechaVencimiento || obtenerFechaFutura(30),
        estado_suscripcion: 'activo',
        sonido_activo: false,
      })

      // Reset form
      setNombreNegocio('')
      setTelefonoContacto('')
      setFechaVencimiento(obtenerFechaFutura(30))
      setMostrarFormulario(false)
      toast.success('¡Negocio registrado exitosamente!')
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar el cliente')
    } finally {
      setGuardando(false)
    }
  }

  const renderBadgeVencimiento = (fecha) => {
    const { estado, etiqueta } = calcularEstadoVencimiento(fecha)
    if (estado === 'vencido') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
          <XCircle className="w-3 h-3" />
          {etiqueta}
        </span>
      )
    }
    if (estado === 'vence_pronto') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" />
          {etiqueta}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" />
        {etiqueta}
      </span>
    )
  }

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col bg-neutral-900/90 border border-neutral-800 rounded-2xl overflow-hidden shrink-0">
      {/* Cabecera del Sidebar */}
      <div className="p-4 border-b border-neutral-800/80 bg-neutral-900">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold tracking-wide text-neutral-200 uppercase">
              Negocios ({clientes.length})
            </h2>
          </div>
          <button
            onClick={() => setMostrarFormulario((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mostrarFormulario
                ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950/30'
            }`}
          >
            {mostrarFormulario ? (
              <>
                <X className="w-3.5 h-3.5" /> Cancelar
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> Nuevo Negocio
              </>
            )}
          </button>
        </div>

        {/* Buscador de clientes */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-8 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 transition-all"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Formulario Desplegable para Registrar Nuevo Negocio */}
      {mostrarFormulario && (
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-neutral-950/80 border-b border-neutral-800 space-y-3 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
            <Plus className="w-3.5 h-3.5" /> Registrar Nueva Pantalla
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              Nombre del Negocio *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Hamburguesería Central"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1 flex items-center gap-1">
              <Phone className="w-3 h-3 text-neutral-400" /> WhatsApp / Contacto (opcional)
            </label>
            <input
              type="tel"
              placeholder="+591 70000000"
              value={telefonoContacto}
              onChange={(e) => setTelefonoContacto(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-neutral-400" /> Vencimiento (+30 días por defecto)
            </label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {guardando ? 'Guardando...' : 'Crear y Asignar TV'}
            </button>
            <button
              type="button"
              onClick={() => setMostrarFormulario(false)}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-1.5 px-3 rounded-lg text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de Negocios */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[calc(100vh-250px)]">
        {cargando ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 bg-neutral-950/60 rounded-xl border border-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-12 px-4 text-neutral-500 text-xs">
            {busqueda
              ? 'No se encontraron negocios con ese criterio.'
              : 'Aún no tienes negocios registrados. Haz clic en "Nuevo Negocio" para comenzar.'}
          </div>
        ) : (
          clientesFiltrados.map((c) => {
            const esSeleccionado = clienteSeleccionado?.id === c.id
            const esActivo = c.estado_suscripcion === 'activo'

            return (
              <div
                key={c.id}
                onClick={() => onSeleccionarCliente(c)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 relative ${
                  esSeleccionado
                    ? 'bg-emerald-950/40 border-emerald-500/70 shadow-sm ring-1 ring-emerald-500/20'
                    : 'bg-neutral-950/70 border-neutral-800/80 hover:bg-neutral-950 hover:border-neutral-700'
                }`}
              >
                {/* Indicador lateral activo */}
                {esSeleccionado && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r" />
                )}

                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-xs text-neutral-100 truncate">
                      {c.nombre_negocio}
                    </h3>
                    {c.telefono_contacto && (
                      <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5 truncate">
                        <Phone className="w-2.5 h-2.5 text-neutral-500 shrink-0" />
                        {c.telefono_contacto}
                      </p>
                    )}
                  </div>

                  {/* Icono de Sonido */}
                  <div
                    className="p-1 rounded-md bg-neutral-900 border border-neutral-800 shrink-0"
                    title={c.sonido_activo ? 'Sonido Remoto: ON' : 'Sonido Remoto: OFF'}
                  >
                    {c.sonido_activo ? (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
                    )}
                  </div>
                </div>

                {/* Badges de Estado y Vencimiento */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-neutral-800/60">
                  <span
                    className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      esActivo
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {esActivo ? 'Activo' : 'Pausado'}
                  </span>

                  {renderBadgeVencimiento(c.fecha_vencimiento)}
                </div>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
