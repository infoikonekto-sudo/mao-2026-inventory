import { ReactNode } from 'react'
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'

interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message?: string
  children?: ReactNode
}

export function Alert({ type, title, message, children }: AlertProps) {
  const styles = {
    info: {
      bg: 'bg-info/10',
      border: 'border-info/30',
      text: 'text-info',
      icon: Info,
    },
    success: {
      bg: 'bg-success/10',
      border: 'border-success/30',
      text: 'text-success',
      icon: CheckCircle,
    },
    warning: {
      bg: 'bg-warning/10',
      border: 'border-warning/30',
      text: 'text-warning',
      icon: AlertTriangle,
    },
    error: {
      bg: 'bg-error/10',
      border: 'border-error/30',
      text: 'text-error',
      icon: AlertCircle,
    },
  }

  const style = styles[type]
  const Icon = style.icon

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4 flex items-start gap-3`}>
      <Icon className={`${style.text} flex-shrink-0 mt-0.5`} size={20} />
      <div className="flex-1">
        {title && <h3 className={`font-semibold ${style.text}`}>{title}</h3>}
        {message && <p className={`text-sm ${style.text} ${title ? 'mt-1' : ''}`}>{message}</p>}
        {children && <div className={`text-sm ${style.text} ${title || message ? 'mt-2' : ''}`}>{children}</div>}
      </div>
    </div>
  )
}
