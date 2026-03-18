import { format } from 'date-fns'

import type { AdminAuditLogConsoleFilters } from '@/apps/org/modules/audit_logs/models/console_model'
import { dateFnsLocale, dateTimePattern } from '@/apps/org/shared/lib/date_locale'

export type WorkspaceView = 'overview' | 'stream' | 'evidence' | 'payload'

export function formatAuditLogDateTime(dateString: string) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString

  return format(date, dateTimePattern(), { locale: dateFnsLocale() })
}

export function formatAuditLogJson(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '[unserializable payload]'
  }
}

export function severityTone(severity: string | null) {
  if (severity === 'error') return 'bg-rose-500/10 text-rose-700 border-rose-200'
  if (severity === 'warn') return 'bg-amber-500/10 text-amber-700 border-amber-200'
  if (severity === 'info') return 'bg-sky-500/10 text-sky-700 border-sky-200'
  return 'bg-zinc-500/10 text-zinc-700 border-zinc-200'
}

export function outcomeTone(outcome: string | null) {
  if (outcome === 'failure') return 'bg-rose-500/10 text-rose-700 border-rose-200'
  if (outcome === 'warning') return 'bg-amber-500/10 text-amber-700 border-amber-200'
  if (outcome === 'success') return 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
  return 'bg-zinc-500/10 text-zinc-700 border-zinc-200'
}

export function toggleClientFilter<K extends keyof AdminAuditLogConsoleFilters>(
  filters: AdminAuditLogConsoleFilters,
  key: K,
  value: AdminAuditLogConsoleFilters[K]
): AdminAuditLogConsoleFilters {
  return {
    ...filters,
    [key]: filters[key] === value ? '' : value,
  }
}
