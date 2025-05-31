/**
 * Date Utilities
 *
 * Helpers for date/time operations.
 * Pattern học từ ancarat-bo: date.ts
 *
 * @module DateUtils
 */

import { DateTime } from 'luxon'

/**
 * Format date for display
 */
export function formatDate(date: Date | DateTime | string | null, format = 'dd/MM/yyyy'): string {
  if (!date) return ''

  let dt: DateTime

  if (date instanceof DateTime) {
    dt = date
  } else if (date instanceof Date) {
    dt = DateTime.fromJSDate(date)
  } else {
    dt = DateTime.fromISO(date)
  }

  return dt.isValid ? dt.toFormat(format) : ''
}

/**
 * Format date time for display
 */
export function formatDateTime(
  date: Date | DateTime | string | null,
  format = 'dd/MM/yyyy HH:mm'
): string {
  return formatDate(date, format)
}

/**
 * Format relative time (e.g., "2 giờ trước")
 */
export function formatRelativeTime(date: Date | DateTime | string | null): string {
  if (!date) return ''

  let dt: DateTime

  if (date instanceof DateTime) {
    dt = date
  } else if (date instanceof Date) {
    dt = DateTime.fromJSDate(date)
  } else {
    dt = DateTime.fromISO(date)
  }

  if (!dt.isValid) return ''

  return dt.toRelative({ locale: 'vi' }) || ''
}

/**
 * Get start of day
 */
export function startOfDay(date: Date | DateTime = DateTime.now()): DateTime {
  const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date)
  return dt.startOf('day')
}

/**
 * Get end of day
 */
export function endOfDay(date: Date | DateTime = DateTime.now()): DateTime {
  const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date)
  return dt.endOf('day')
}

/**
 * Get start of week (Monday)
 */
export function startOfWeek(date: Date | DateTime = DateTime.now()): DateTime {
  const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date)
  return dt.startOf('week')
}

/**
 * Get end of week (Sunday)
 */
export function endOfWeek(date: Date | DateTime = DateTime.now()): DateTime {
  const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date)
  return dt.endOf('week')
}

/**
 * Get start of month
 */
export function startOfMonth(date: Date | DateTime = DateTime.now()): DateTime {
  const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date)
  return dt.startOf('month')
}

/**
 * Get end of month
 */
export function endOfMonth(date: Date | DateTime = DateTime.now()): DateTime {
  const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date)
  return dt.endOf('month')
}

/**
 * Check if date is today
 */
export function isToday(date: Date | DateTime | string | null): boolean {
  if (!date) return false

  let dt: DateTime

  if (date instanceof DateTime) {
    dt = date
  } else if (date instanceof Date) {
    dt = DateTime.fromJSDate(date)
  } else {
    dt = DateTime.fromISO(date)
  }

  return dt.hasSame(DateTime.now(), 'day')
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | DateTime | string | null): boolean {
  if (!date) return false

  let dt: DateTime

  if (date instanceof DateTime) {
    dt = date
  } else if (date instanceof Date) {
    dt = DateTime.fromJSDate(date)
  } else {
    dt = DateTime.fromISO(date)
  }

  return dt < DateTime.now()
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | DateTime | string | null): boolean {
  if (!date) return false

  let dt: DateTime

  if (date instanceof DateTime) {
    dt = date
  } else if (date instanceof Date) {
    dt = DateTime.fromJSDate(date)
  } else {
    dt = DateTime.fromISO(date)
  }

  return dt > DateTime.now()
}

/**
 * Get date range between two dates
 */
export function getDateRange(startDate: DateTime, endDate: DateTime): DateTime[] {
  const dates: DateTime[] = []
  let current = startDate

  while (current <= endDate) {
    dates.push(current)
    current = current.plus({ days: 1 })
  }

  return dates
}

/**
 * Calculate difference between two dates
 */
export function dateDiff(
  startDate: Date | DateTime | string,
  endDate: Date | DateTime | string,
  unit: 'days' | 'hours' | 'minutes' | 'seconds' = 'days'
): number {
  const start =
    startDate instanceof DateTime
      ? startDate
      : startDate instanceof Date
        ? DateTime.fromJSDate(startDate)
        : DateTime.fromISO(startDate)

  const end =
    endDate instanceof DateTime
      ? endDate
      : endDate instanceof Date
        ? DateTime.fromJSDate(endDate)
        : DateTime.fromISO(endDate)

  return Math.abs(end.diff(start, unit)[unit])
}

/**
 * Format duration from minutes
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} phút`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} giờ`
  }

  return `${hours} giờ ${remainingMinutes} phút`
}

/**
 * Parse date from various formats
 */
export function parseDate(value: unknown): DateTime | null {
  if (!value) return null

  if (value instanceof DateTime) {
    return value
  }

  if (value instanceof Date) {
    return DateTime.fromJSDate(value)
  }

  if (typeof value === 'string') {
    // Try ISO format first
    let dt = DateTime.fromISO(value)
    if (dt.isValid) return dt

    // Try common formats
    const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'dd-MM-yyyy']
    for (const format of formats) {
      dt = DateTime.fromFormat(value, format)
      if (dt.isValid) return dt
    }
  }

  if (typeof value === 'number') {
    return DateTime.fromMillis(value)
  }

  return null
}
