// Utilidades generales para Kaldirev Display

/**
 * Detecta si una URL corresponde a un archivo de video
 */
export const esVideo = (url) => {
  if (!url) return false
  return (
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) ||
    url.includes('/video/upload/') ||
    url.includes('resource_type=video')
  )
}

/**
 * Formatea una fecha ISO a formato legible dd/mm/aaaa
 */
export const formatearFecha = (fechaStr) => {
  if (!fechaStr) return 'Sin fecha'
  try {
    const fecha = new Date(fechaStr)
    if (isNaN(fecha.getTime())) return fechaStr
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return fechaStr
  }
}

/**
 * Convierte una fecha a formato YYYY-MM-DD para inputs de tipo date
 */
export const fechaParaInput = (fechaStr) => {
  if (!fechaStr) return ''
  try {
    const fecha = new Date(fechaStr)
    if (isNaN(fecha.getTime())) return ''
    return fecha.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

/**
 * Calcula el estado de vencimiento de la suscripción
 * Retorna: { estado: 'al_dia' | 'vence_pronto' | 'vencido', diasRestantes: number, etiqueta: string }
 */
export const calcularEstadoVencimiento = (fechaVencimiento) => {
  if (!fechaVencimiento) {
    return { estado: 'al_dia', diasRestantes: 999, etiqueta: 'Sin vencimiento' }
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const vencimiento = new Date(fechaVencimiento)
  vencimiento.setHours(0, 0, 0, 0)

  const diffTiempo = vencimiento.getTime() - hoy.getTime()
  const diasRestantes = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24))

  if (diasRestantes < 0) {
    return {
      estado: 'vencido',
      diasRestantes,
      etiqueta: `Vencido (${Math.abs(diasRestantes)}d)`,
    }
  }

  if (diasRestantes <= 5) {
    return {
      estado: 'vence_pronto',
      diasRestantes,
      etiqueta: diasRestantes === 0 ? 'Vence hoy' : `Vence en ${diasRestantes}d`,
    }
  }

  return {
    estado: 'al_dia',
    diasRestantes,
    etiqueta: `Al día (${diasRestantes}d)`,
  }
}

/**
 * Calcula la fecha sumando N días desde hoy en formato YYYY-MM-DD
 */
export const obtenerFechaFutura = (dias = 30) => {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}
