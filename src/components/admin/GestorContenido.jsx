import { useState } from 'react'
import {
  Upload,
  Link as LinkIcon,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Edit3,
  Clock,
  Video,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Play,
  Loader2,
} from 'lucide-react'
import { esVideo } from '../../utils/helpers'
import { useToast } from '../../context/ToastContext'
import Modal from '../common/Modal'

export default function GestorContenido({
  cliente,
  slides,
  onAgregarSlide,
  onEliminarSlide,
  onActualizarSlide,
  onReordenarSlides,
}) {
  const toast = useToast()

  // Estado del formulario de subida
  const [titulo, setTitulo] = useState('')
  const [url, setUrl] = useState('')
  const [duracion, setDuracion] = useState(6)
  const [subiendo, setSubiendo] = useState(false)
  const [progresoSubida, setProgresoSubida] = useState(0)

  // Estado para modal de edición
  const [slideParaEditar, setSlideParaEditar] = useState(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editDuracion, setEditDuracion] = useState(6)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  // Estado para modal de confirmación de eliminación
  const [slideParaEliminar, setSlideParaEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  // Subir archivo a Cloudinary con XMLHttpRequest para progreso real
  const subirACloudinary = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
      toast.error('Faltan VITE_CLOUDINARY_CLOUD_NAME o VITE_CLOUDINARY_UPLOAD_PRESET en el entorno')
      return
    }

    setSubiendo(true)
    setProgresoSubida(10)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        setProgresoSubida(percent)
      }
    }

    xhr.onload = () => {
      setSubiendo(false)
      setProgresoSubida(0)
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText)
          if (res.secure_url) {
            let optimizada = res.secure_url
            // Si es imagen, optimizar automáticamente con f_auto,q_auto
            if (!esVideo(optimizada)) {
              optimizada = optimizada.replace('/upload/', '/upload/f_auto,q_auto/')
            }
            setUrl(optimizada)
            toast.success('Archivo subido a Cloudinary exitosamente')
          } else {
            toast.error('Respuesta inesperada de Cloudinary')
          }
        } catch {
          toast.error('Error al procesar respuesta del servidor')
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText)
          toast.error(`Error Cloudinary: ${errRes.error?.message || xhr.statusText}`)
        } catch {
          toast.error('Error al subir el archivo multimedia')
        }
      }
    }

    xhr.onerror = () => {
      setSubiendo(false)
      setProgresoSubida(0)
      toast.error('Error de red al conectar con Cloudinary')
    }

    xhr.send(formData)
    e.target.value = ''
  }

  // Guardar nueva diapositiva
  const handleAgregar = async (e) => {
    e.preventDefault()
    if (!url.trim()) {
      toast.warning('Debes subir un archivo o ingresar una URL válida')
      return
    }

    try {
      const proximoOrden = slides.length > 0 ? Math.max(...slides.map((s) => s.orden || 0)) + 1 : 1

      await onAgregarSlide({
        cliente_id: cliente.id,
        titulo: titulo.trim() || null,
        url_imagen: url.trim(),
        duracion_segundos: Number(duracion) || 6,
        orden: proximoOrden,
        activo: true,
      })

      setTitulo('')
      setUrl('')
      setDuracion(6)
      toast.success('Promoción agregada a la pantalla')
    } catch (err) {
      console.error(err)
      toast.error('Error al agregar el contenido')
    }
  }

  // Alternar visibilidad (activo / inactivo)
  const handleToggleActivo = async (slide) => {
    try {
      await onActualizarSlide(slide.id, { activo: !slide.activo })
      toast.info(slide.activo ? 'Promoción oculta de la pantalla' : 'Promoción activada en la pantalla')
    } catch (err) {
      console.error(err)
      toast.error('Error al cambiar estado')
    }
  }

  // Mover elemento hacia arriba
  const handleSubirOrden = async (index) => {
    if (index <= 0) return
    const actual = slides[index]
    const anterior = slides[index - 1]

    const nuevoOrdenActual = anterior.orden ?? index
    const nuevoOrdenAnterior = actual.orden ?? index + 1

    try {
      await onReordenarSlides(
        { id: actual.id, orden: nuevoOrdenActual },
        { id: anterior.id, orden: nuevoOrdenAnterior }
      )
      toast.success('Orden actualizado')
    } catch (err) {
      console.error(err)
      toast.error('Error al reordenar')
    }
  }

  // Mover elemento hacia abajo
  const handleBajarOrden = async (index) => {
    if (index >= slides.length - 1) return
    const actual = slides[index]
    const siguiente = slides[index + 1]

    const nuevoOrdenActual = siguiente.orden ?? index + 2
    const nuevoOrdenSiguiente = actual.orden ?? index + 1

    try {
      await onReordenarSlides(
        { id: actual.id, orden: nuevoOrdenActual },
        { id: siguiente.id, orden: nuevoOrdenSiguiente }
      )
      toast.success('Orden actualizado')
    } catch (err) {
      console.error(err)
      toast.error('Error al reordenar')
    }
  }

  // Abrir modal de edición
  const abrirEdicion = (slide) => {
    setSlideParaEditar(slide)
    setEditTitulo(slide.titulo || '')
    setEditDuracion(slide.duracion_segundos || 6)
  }

  // Guardar edición
  const guardarEdicionSlide = async (e) => {
    e.preventDefault()
    if (!slideParaEditar) return

    setGuardandoEdicion(true)
    try {
      await onActualizarSlide(slideParaEditar.id, {
        titulo: editTitulo.trim() || null,
        duracion_segundos: Number(editDuracion) || 6,
      })
      setSlideParaEditar(null)
      toast.success('Promoción actualizada con éxito')
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar la promoción')
    } finally {
      setGuardandoEdicion(false)
    }
  }

  // Confirmar y eliminar
  const confirmarEliminacion = async () => {
    if (!slideParaEliminar) return
    setEliminando(true)
    try {
      await onEliminarSlide(slideParaEliminar.id)
      setSlideParaEliminar(null)
      toast.success('Contenido eliminado de la pantalla')
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar contenido')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario de Subida y Creación */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 lg:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold tracking-wide text-neutral-200 uppercase">
            Añadir Contenido a la Cartelera
          </h3>
        </div>

        <form onSubmit={handleAgregar} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Título promocional */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Título o Promoción (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. 2x1 en Hamburguesas los Martes"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* URL o Subida directa a Cloudinary */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Archivo Multimedia (JPG, PNG, WebP, MP4, WebM)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    required
                    placeholder="Sube archivo o pega URL directa..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-3 pr-8 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                  {url && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {esVideo(url) ? (
                        <Video className="w-3.5 h-3.5 text-emerald-400" title="Detectado como Video" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-400" title="Detectado como Imagen" />
                      )}
                    </span>
                  )}
                </div>

                <label
                  className={`bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/80 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all ${
                    subiendo ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {subiendo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>{progresoSubida}%</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Subir</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                    onChange={subirACloudinary}
                    disabled={subiendo}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Barra de progreso de subida */}
          {subiendo && (
            <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden border border-neutral-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-200"
                style={{ width: `${progresoSubida}%` }}
              />
            </div>
          )}

          {/* Fila Inferior: Duración y Botón Submit */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-neutral-500" />
              <span>Duración para imágenes:</span>
              <input
                type="number"
                min="2"
                max="120"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                className="w-16 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-center text-neutral-100 font-semibold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-neutral-500">segundos (los videos avanzan al terminar)</span>
            </div>

            <button
              type="submit"
              disabled={subiendo || !url.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-emerald-950/40 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar a Pantalla</span>
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Diapositivas y Videos Cargados */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800/80">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold tracking-wide text-neutral-200 uppercase">
              Carrusel de Reproducción ({slides.length} diapositivas)
            </h3>
          </div>
          <p className="text-xs text-neutral-500 hidden sm:block">
            Usa las flechas para ordenar la secuencia en pantalla
          </p>
        </div>

        {slides.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-600">
              <ImageIcon className="w-6 h-6" />
            </div>
            <p className="text-sm text-neutral-300 font-medium">Aún no hay contenido en esta pantalla</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Sube tus imágenes promocionales o videos en formato vertical/horizontal para comenzar la
              reproducción.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slides.map((slide, index) => {
              const esVid = esVideo(slide.url_imagen)
              const estaActivo = slide.activo !== false

              return (
                <div
                  key={slide.id}
                  className={`bg-neutral-950 border rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${
                    estaActivo
                      ? 'border-neutral-800/90 hover:border-neutral-700 shadow-sm'
                      : 'border-neutral-800/40 opacity-60 bg-neutral-950/50'
                  }`}
                >
                  {/* Vista Previa Multimedia */}
                  <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center group">
                    {esVid ? (
                      <video
                        src={slide.url_imagen}
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={slide.url_imagen}
                        alt={slide.titulo || 'Contenido de pantalla'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}

                    {/* Badge de Posición / Orden */}
                    <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
                      <span>#{index + 1}</span>
                    </div>

                    {/* Badge de Tipo de Archivo */}
                    <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md text-xs px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
                      {esVid ? (
                        <>
                          <Video className="w-3 h-3 text-emerald-400" />
                          <span className="text-[11px] text-neutral-300 font-medium">Video (Auto)</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span className="text-[11px] text-neutral-300 font-medium">
                            {slide.duracion_segundos}s
                          </span>
                        </>
                      )}
                    </div>

                    {/* Overlay si está inactivo */}
                    {!estaActivo && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <span className="text-xs font-semibold text-neutral-400 bg-neutral-900/90 border border-neutral-700 px-3 py-1 rounded-full flex items-center gap-1.5">
                          <EyeOff className="w-3.5 h-3.5 text-neutral-500" /> Diapositiva Oculta
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cuerpo de la Diapositiva */}
                  <div className="p-3.5 flex flex-col justify-between flex-1 gap-3">
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-200 line-clamp-1">
                        {slide.titulo || (
                          <span className="text-neutral-500 italic">Sin título promocional</span>
                        )}
                      </h4>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {slide.url_imagen}
                      </p>
                    </div>

                    {/* Barra de Acciones: Reordenar, Visibilidad, Editar y Eliminar */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                      {/* Botones de Reordenamiento */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSubirOrden(index)}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                          title="Mover antes en la secuencia"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBajarOrden(index)}
                          disabled={index === slides.length - 1}
                          className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                          title="Mover después en la secuencia"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Botones de Operación */}
                      <div className="flex items-center gap-1.5">
                        {/* Activar / Ocultar Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleActivo(slide)}
                          className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                            estaActivo
                              ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/40'
                              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/60'
                          }`}
                          title={estaActivo ? 'Ocultar temporalmente del TV' : 'Mostrar en el TV'}
                        >
                          {estaActivo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        {/* Editar Título / Duración */}
                        <button
                          type="button"
                          onClick={() => abrirEdicion(slide)}
                          className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                          title="Editar título o duración"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Eliminar Diapositiva */}
                        <button
                          type="button"
                          onClick={() => setSlideParaEliminar(slide)}
                          className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/30 transition cursor-pointer"
                          title="Eliminar de la pantalla"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal para Editar Título y Duración */}
      <Modal
        isOpen={Boolean(slideParaEditar)}
        onClose={() => setSlideParaEditar(null)}
        title="Editar Diapositiva Promocional"
      >
        {slideParaEditar && (
          <form onSubmit={guardarEdicionSlide} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Título o Leyenda
              </label>
              <input
                type="text"
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
                placeholder="Ej. Promoción válida hasta agotar stock"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {!esVideo(slideParaEditar.url_imagen) && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Duración en Pantalla (segundos)
                </label>
                <input
                  type="number"
                  min="2"
                  max="120"
                  value={editDuracion}
                  onChange={(e) => setEditDuracion(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setSlideParaEditar(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoEdicion}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        isOpen={Boolean(slideParaEliminar)}
        onClose={() => setSlideParaEliminar(null)}
        title="Confirmar Eliminación"
      >
        {slideParaEliminar && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-300 leading-relaxed">
              ¿Estás seguro de que deseas eliminar esta diapositiva de la pantalla de{' '}
              <strong className="text-white">{cliente.nombre_negocio}</strong>? Esta acción no se
              puede deshacer.
            </p>

            <div className="flex gap-2 justify-end pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setSlideParaEliminar(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminacion}
                disabled={eliminando}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {eliminando ? 'Eliminando...' : 'Eliminar Definitivamente'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
