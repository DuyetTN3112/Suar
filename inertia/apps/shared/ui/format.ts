type DateInput = Date | number | string | null | undefined

export const DEFAULT_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}

export function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_FORMAT_OPTIONS,
  locale = 'en-US'
): string {
  const date = toValidDate(value)
  if (!date) return '—'

  return new Intl.DateTimeFormat(locale, options).format(date)
}

export function formatRelative(value: DateInput, now: DateInput = new Date(), locale = 'en-US'): string {
  const date = toValidDate(value)
  const reference = toValidDate(now)
  if (!date || !reference) return '—'

  const diffSeconds = Math.round((date.getTime() - reference.getTime()) / 1000)
  const absoluteSeconds = Math.abs(diffSeconds)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (absoluteSeconds < 60) return formatter.format(diffSeconds, 'second')

  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute')

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour')

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) return formatter.format(diffDays, 'day')

  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) return formatter.format(diffMonths, 'month')

  return formatter.format(Math.round(diffMonths / 12), 'year')
}
