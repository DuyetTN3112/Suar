import type { Task } from './types.svelte'

export interface TaskShowProps {
  task: Task
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canAssign: boolean
    canChangeStatus: boolean
    canApply: boolean
  }
  auditLogs: Array<{
    id: string
    action: string
    changes: Record<string, { old: unknown; new: unknown }>
    created_at: string
    user?: { id: string; username: string }
  }>
}

export const statusColors: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-800',
  in_progress: 'bg-blue-100 text-blue-800',
  in_review: 'bg-fuchsia-100 text-fuchsia-800',
  done: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800',
}

export const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

export const labelColors: Record<string, string> = {
  bug: 'bg-red-100 text-red-800',
  feature: 'bg-blue-100 text-blue-800',
  enhancement: 'bg-fuchsia-100 text-fuchsia-800',
  documentation: 'bg-orange-100 text-orange-800',
}

export function formatAuditChangeValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((item) => formatAuditChangeValue(item)).join(', ') : '[]'
  }
  if (typeof value === 'function' || typeof value === 'symbol') {
    return value.toString()
  }

  return JSON.stringify(value)
}
