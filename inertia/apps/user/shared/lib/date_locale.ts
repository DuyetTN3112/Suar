import type { Locale } from 'date-fns'
import { enUS, vi } from 'date-fns/locale'

export type SupportedLocale = 'en' | 'vi'

export function currentDocumentLocale(): SupportedLocale {
  if (typeof document !== 'undefined' && document.documentElement.lang.startsWith('vi')) {
    return 'vi'
  }

  return 'en'
}

export function dateFnsLocale(locale: string = currentDocumentLocale()): Locale {
  return locale === 'vi' ? vi : enUS
}

export function shortDatePattern(locale: string = currentDocumentLocale()): string {
  return locale === 'vi' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'
}

export function dateTimePattern(locale: string = currentDocumentLocale()): string {
  return locale === 'vi' ? 'dd/MM/yyyy HH:mm' : 'PP p'
}
