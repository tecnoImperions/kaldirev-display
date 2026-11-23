import { useState, useEffect } from 'react'
import {
  Copy,
  Check,
  ExternalLink,
  Volume2,
  VolumeX,
  Power,
  Calendar,
  Phone,
  Edit2,
  Save,
  X,
  Clock,
  Tv,
} from 'lucide-react'
import { fechaParaInput, formatearFecha, calcularEstadoVencimiento } from '../../utils/helpers'
import { useToast } from '../../context/ToastContext'

export default function DetalleCliente({
  cliente,
  onActualizarCliente,
  onAlternarSonido,
  onAlternarSuscripcion,
}) {
  const toast = useToast()
  const [copiado, setCopiado] = useState(false)
  const [editandoInfo, setEditandoInfo] = useState(false)
  const [nombre, setNombre] = useState(cliente?.nombre_negocio || '')
  const [telefono, setTelefono] = useState(cliente?.telefono_contacto || '')
  const [fechaVenc, setFechaVenc] = useState(fechaParaInput(cliente?.fecha_vencimiento))
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (cliente) {
      setNombre(cliente.nombre_negocio || '')
      setTelefono(cliente.telefono_contacto || '')
      setFechaVenc(fechaParaInput(cliente.fecha_vencimiento))
      setEditandoInfo(false)
    }
  }, [cliente?.id, cliente?.fecha_vencimiento, cliente?.nombre_negocio, cliente?.telefono_contacto])

  if (!cliente) return null

  const tvUrl = `${window.location.origin}/?tv=${cliente.id}`

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(tvUrl)
      setCopiado(true)
      toast.success('¡Enlace de TV copiado al portapapeles!')
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  const guardarCambiosInfo = async () => {
    if (!nombre.trim()) {
      toast.warning('El nombre del negocio no puede estar vacío')
      return
    }

    setGuardando(true)
    try {
      await onActualizarCliente(cliente.id, {
        nombre_negocio: nombre.trim(),
        telefono_contacto: telefono.trim() || null,
        fecha_vencimiento: fechaVenc || null,
      })
      setEditandoInfo(false)
      toast.success('Datos del cliente actualizados')
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar datos')
    } finally {
      setGuardando(false)
    }
  }

  const { estado: estadoVenc, etiqueta: etiquetaVenc } = calcularEstadoVencimiento(
    cliente.fecha_vencimiento
  )
  const esActivo = cliente.estado_suscripcion === 'activo'

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 lg:p-6 mb-6">
      {/* Fila Superior: Título + Botones de Acción Rápida */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-neutral-100 tracking-tight">
              {cliente.nombre_negocio}
            </h2>

            {/* Badge de Suscripción */}
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                esActivo
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {esActivo ? 'Servicio Activo' : 'Servicio Pausado'}
            </span>

            {/* Badge de Vencimiento */}
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                estadoVenc === 'vencido'
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : estadoVenc === 'vence_pronto'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {etiquetaVenc}
            </span>
          </div>

          {/* Enlace y UUID */}
          <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400 flex-wrap">
            <span className="font-medium text-neutral-500">ID Pantalla:</span>
            <code className="bg-neutral-950 px-2 py-0.5 rounded text-[11px] text-neutral-300 font-mono border border-neutral-800">
              {cliente.id}
            </code>
          </div>
        </div>

        {/* Acciones principales: Copiar Link, Abrir TV, Sonido, Pausar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Copiar Enlace TV */}
          <button
            onClick={copiarEnlace}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              copiado
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50'
                : 'bg-neutral-950 text-neutral-200 border-neutral-700/80 hover:bg-neutral-800'
            }`}
            title="Copiar URL para el Smart TV"
          >
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiado ? 'Enlace Copiado' : 'Copiar Enlace TV'}</span>
          </button>

          {/* Botón Abrir Pantalla TV en nueva pestaña */}
          <a
            href={tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Abrir vista de televisor en nueva pestaña"
          >
            <Tv className="w-3.5 h-3.5 text-emerald-400" />
            <span>Abrir TV</span>
            <ExternalLink className="w-3 h-3 text-neutral-500" />
          </a>

          {/* Interruptor Sonido Remoto */}
          <button
            onClick={() => onAlternarSonido(cliente)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              cliente.sonido_activo
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-neutral-950 text-neutral-400 border-neutral-700/80 hover:bg-neutral-800 hover:text-neutral-200'
            }`}
            title="Activar o desactivar sonido para todos los videos en esta pantalla"
          >
            {cliente.sonido_activo ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" /> Sonido: ON
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-neutral-500" /> Sonido: OFF
              </>
            )}
          </button>

          {/* Interruptor Suscripción */}
          <button
            onClick={() => onAlternarSuscripcion(cliente)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              esActivo
                ? 'bg-amber-600/15 text-amber-400 border-amber-500/40 hover:bg-amber-600/25'
                : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
            }`}
            title={esActivo ? 'Pausar servicio por falta de pago' : 'Reactivar servicio'}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{esActivo ? 'Pausar Servicio' : 'Reactivar Servicio'}</span>
          </button>
        </div>
      </div>

      {/* Fila Inferior: Detalles de Contacto y Vencimiento con modo edición */}
      <div className="pt-4">
        {editandoInfo ? (
          <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-xl space-y-3">
            <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
              <Edit2 className="w-3.5 h-3.5 text-emerald-400" /> Editar Información de Contacto y
              Suscripción
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Nombre del Negocio
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+591 ..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={fechaVenc}
                  onChange={(e) => setFechaVenc(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setEditandoInfo(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCambiosInfo}
                disabled={guardando}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-neutral-500" />
                <span>Contacto:</span>
                <span className="font-medium text-neutral-200">
                  {cliente.telefono_contacto || 'No especificado'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                <span>Vence:</span>
                <span className="font-medium text-neutral-200">
                  {formatearFecha(cliente.fecha_vencimiento)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setEditandoInfo(true)}
              className="text-neutral-400 hover:text-emerald-400 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer px-2.5 py-1 rounded-lg hover:bg-neutral-800/80"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar Info / Vencimiento</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
