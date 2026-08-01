import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date'
  }
  return new Intl.DateTimeFormat(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US', options).format(date)
}
