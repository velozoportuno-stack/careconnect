import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const formatCurrency = (amount, currency = 'EUR') => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
  }).format(amount)
}

export const formatDate = (dateStr, pattern = "dd 'de' MMMM 'de' yyyy") => {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, pattern, { locale: ptBR })
  } catch {
    return dateStr
  }
}

export const formatTime = (timeStr) => {
  if (!timeStr) return ''
  return timeStr.slice(0, 5) // HH:MM
}

export const formatRating = (rating) => {
  return Number(rating || 0).toFixed(1)
}

export const formatPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
}
