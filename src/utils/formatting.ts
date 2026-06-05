import { CURRENCY } from '@/constants'

/**
 * Formatea un número como moneda guatemalteca
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat(CURRENCY.LOCALE, {
    style: 'currency',
    currency: CURRENCY.CODE,
  }).format(amount)
}

/**
 * Calcula IVA (12%)
 */
export const calculateTax = (amount: number): number => {
  return amount * CURRENCY.TAX_RATE
}

/**
 * Calcula total con IVA incluido
 */
export const calculateTotal = (subtotal: number): number => {
  return subtotal + calculateTax(subtotal)
}

/**
 * Formatea fecha corta
 */
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Formatea fecha con hora
 */
export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Obtiene tiempo relativo (ej: "hace 5 minutos")
 */
export const getRelativeTime = (date: string | Date): string => {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  let interval = seconds / 31536000
  if (interval > 1) return `hace ${Math.floor(interval)} años`

  interval = seconds / 2592000
  if (interval > 1) return `hace ${Math.floor(interval)} meses`

  interval = seconds / 86400
  if (interval > 1) return `hace ${Math.floor(interval)} días`

  interval = seconds / 3600
  if (interval > 1) return `hace ${Math.floor(interval)} horas`

  interval = seconds / 60
  if (interval > 1) return `hace ${Math.floor(interval)} minutos`

  return 'hace unos segundos'
}
