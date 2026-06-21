import { useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  visible: boolean
  onClose: () => void
  duration?: number
}

const toastStyles: Record<ToastType, { bg: string; icon: typeof CheckCircle; iconColor: string }> = {
  success: {
    bg: 'bg-green-50 border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-500',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: XCircle,
    iconColor: 'text-red-500',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: Info,
    iconColor: 'text-blue-500',
  },
}

export function Toast({
  message,
  type = 'info',
  visible,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [visible, duration, onClose])

  if (!visible) return null

  const style = toastStyles[type]
  const Icon = style.icon

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[280px] max-w-md',
          style.bg
        )}
      >
        <Icon className={cn('w-5 h-5 flex-shrink-0', style.iconColor)} />
        <p className="flex-1 text-sm text-gray-800">{message}</p>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
          aria-label="关闭"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  )
}
