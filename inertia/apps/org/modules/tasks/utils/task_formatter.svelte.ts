import { format, parseISO } from 'date-fns'

import { dateFnsLocale, dateTimePattern, shortDatePattern } from '@/apps/org/shared/lib/date_locale'

type DateInput = string | Date | { toISO?: () => string | null; toString?: () => string } | null | undefined

function normalizeDateInput(value: DateInput): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  const raw =
    typeof value === 'string'
      ? value
      : typeof value.toISO === 'function'
        ? value.toISO()
        : typeof value.toString === 'function'
          ? value.toString()
          : null

  if (!raw) return null
  const date = parseISO(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Format ISO-like date input using active locale.
 */
export function formatDate(dateString: DateInput): string {
  const date = normalizeDateInput(dateString)
  return date ? format(date, shortDatePattern(), { locale: dateFnsLocale() }) : ''
}

/**
 * Format date and time using active locale.
 */
export function formatDateTime(dateString: DateInput): string {
  const date = normalizeDateInput(dateString)
  return date ? format(date, dateTimePattern(), { locale: dateFnsLocale() }) : ''
}

/**
 * Format estimated time as hours and minutes.
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
 * Calculate task completion percentage.
 */
export function calculateCompletionPercentage(
  completedSubtasks: number,
  totalSubtasks: number
): number {
  if (totalSubtasks === 0) return 0
  return Math.round((completedSubtasks / totalSubtasks) * 100)
}

/**
 * Get default status color from status name.
 */
export function getDefaultStatusColor(statusName: string): string {
  const name = normalizeSearchText(statusName)

  if (name.includes('todo') || name.includes('open') || name.includes('moi')) {
    return '#3498db'
  }

  if (name.includes('progress') || name.includes('dang')) {
    return '#f39c12'
  }

  if (name.includes('done') || name.includes('completed') || name.includes('hoan thanh')) {
    return '#2ecc71'
  }

  if (name.includes('cancel') || name.includes('huy')) {
    return '#e74c3c'
  }

  return '#95a5a6'
}

/**
 * Get initials from a full name.
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
 * Get priority color from numeric value.
 */
export function getPriorityColor(value: number): string {
  if (value >= 4) return '#e74c3c' // High
  if (value >= 3) return '#f39c12' // Medium
  return '#3498db' // Low
}
