import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

/**
 * Định dạng ngày tháng từ chuỗi ISO sang định dạng Việt Nam
 */
export function formatDate(dateString: string): string {
  if (!dateString) return ''

  try {
    const date = parseISO(dateString)
    return format(date, 'dd/MM/yyyy', { locale: vi })
  } catch (error) {
    console.error('Lỗi định dạng ngày tháng:', error)
    return dateString
  }
}

/**
 * Định dạng ngày tháng đầy đủ với giờ phút
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return ''

  try {
    const date = parseISO(dateString)
    return format(date, 'dd/MM/yyyy HH:mm', { locale: vi })
  } catch (error) {
    console.error('Lỗi định dạng ngày giờ:', error)
    return dateString
  }
}

/**
 * Định dạng thời gian ước tính sang giờ:phút
 */
export function formatEstimatedTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '0'

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}p` : `${hours}h`
  }

  return `${remainingMinutes}p`
}

/**
 * Tính phần trăm hoàn thành của task
 */
export function calculateCompletionPercentage(
  completedSubtasks: number,
  totalSubtasks: number
): number {
  if (totalSubtasks === 0) return 0
  return Math.round((completedSubtasks / totalSubtasks) * 100)
}

/**
 * Lấy màu trạng thái mặc định dựa trên tên
 */
export function getDefaultStatusColor(statusName: string): string {
  const name = statusName.toLowerCase()

  if (name.includes('todo') || name.includes('open') || name.includes('mới')) {
    return '#3498db'
  }

  if (name.includes('progress') || name.includes('đang')) {
    return '#f39c12'
  }

  if (name.includes('done') || name.includes('completed') || name.includes('hoàn thành')) {
    return '#2ecc71'
  }

  if (name.includes('cancel') || name.includes('hủy')) {
    return '#e74c3c'
  }

  return '#95a5a6'
}

/**
 * Lấy tên viết tắt từ họ tên đầy đủ
 */
export function getInitials(fullName: string): string {
  if (!fullName) return ''

  return fullName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

/**
 * Lấy màu ưu tiên dựa trên giá trị
 */
export function getPriorityColor(value: number): string {
  if (value >= 4) return '#e74c3c' // High
  if (value >= 3) return '#f39c12' // Medium
  return '#3498db' // Low
}
