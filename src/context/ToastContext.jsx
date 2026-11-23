import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    ({ message, type = 'info', duration = 3500 }) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9)
      const newToast = { id, message, type }

      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  const toast = {
    success: (msg, duration) => addToast({ message: msg, type: 'success', duration }),
    error: (msg, duration) => addToast({ message: msg, type: 'error', duration }),
    warning: (msg, duration) => addToast({ message: msg, type: 'warning', duration }),
    info: (msg, duration) => addToast({ message: msg, type: 'info', duration }),
  }

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
      default:
        return <Info className="w-5 h-5 text-cyan-400 shrink-0" />
    }
  }

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 bg-neutral-900/95 text-neutral-100 shadow-emerald-950/20'
      case 'error':
        return 'border-red-500/30 bg-neutral-900/95 text-neutral-100 shadow-red-950/20'
      case 'warning':
        return 'border-amber-500/30 bg-neutral-900/95 text-neutral-100 shadow-amber-950/20'
      default:
        return 'border-cyan-500/30 bg-neutral-900/95 text-neutral-100 shadow-cyan-950/20'
    }
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${getToastStyles(
              t.type
            )}`}
          >
            {getToastIcon(t.type)}
            <div className="flex-1 text-xs font-medium leading-relaxed pr-1 pt-0.5">
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-neutral-400 hover:text-neutral-200 transition-colors p-0.5 rounded cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider')
  }
  return context
}
