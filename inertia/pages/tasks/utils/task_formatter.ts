import { parseISO, format } from 'date-fns'
import { vi } from 'date-fns/locale'

export const formatDate = (dateString: string): string => {
  if (!dateString) return ''

  try {
    const date = parseISO(dateString)
    return format(date, 'dd/MM/yyyy', { locale: vi })
  } catch (error) {
    console.error('Lỗi định dạng ngày tháng:', error)
    return dateString
  }
}

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return ''

  try {
    const date = parseISO(dateString)
    return format(date, 'dd/MM/yyyy HH:mm', { locale: vi })
  } catch (error) {
    console.error('Lỗi định dạng ngày giờ:', error)
    return dateString
  }
}

export const formatEstimatedTime = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0'

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}p` : `${hours}h`
  }

  return `${remainingMinutes}p`
}

export const calculateCompletionPercentage = (
  completedSubtasks: number,
  totalSubtasks: number
): number => {
  if (totalSubtasks === 0) return 0
  return Math.round((completedSubtasks / totalSubtasks) * 100)
}

export const getDefaultStatusColor = (statusName: string): string => {
  const name = statusName.toLowerCase()

  if (name.includes('todo') || name.includes('open') || name.includes('mới')) {
    return '#3b82f6'
  }
  if (name.includes('progress') || name.includes('doing') || name.includes('đang')) {
    return '#f59e0b'
  }
  if (name.includes('done') || name.includes('complete') || name.includes('hoàn')) {
    return '#10b981'
  }
  if (name.includes('block') || name.includes('hold') || name.includes('chặn')) {
    return '#ef4444'
  }

  return '#6b7280'
}

export const getDefaultPriorityColor = (priorityName: string): string => {
  const name = priorityName.toLowerCase()

  if (name.includes('high') || name.includes('urgent') || name.includes('cao')) {
    return '#ef4444'
  }
  if (name.includes('medium') || name.includes('normal') || name.includes('trung')) {
    return '#f59e0b'
  }
  if (name.includes('low') || name.includes('thấp')) {
    return '#10b981'
  }

  return '#6b7280'
}
