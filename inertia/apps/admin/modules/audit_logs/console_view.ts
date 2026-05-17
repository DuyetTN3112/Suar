import type { AdminAuditLogConsoleFilters } from '@/apps/admin/modules/audit_logs/console_model'
import { format } from 'date-fns'
import { dateFnsLocale, dateTimePattern } from '@/apps/admin/shared/lib/date_locale'

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
  if (severity === 'error') return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
  if (severity === 'warn') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  if (severity === 'info') return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
  return 'border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300'
}

export function outcomeTone(outcome: string | null) {
  if (outcome === 'failure') return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
  if (outcome === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  if (outcome === 'success') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  return 'border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300'
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
