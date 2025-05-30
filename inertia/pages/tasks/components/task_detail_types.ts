import type { Task } from '../types.svelte'

export interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  statuses: Array<{ value: string; label: string; color: string }>
  priorities: Array<{ value: string; label: string; color: string }>
  labels: Array<{ value: string; label: string; color: string }>
  users?: Array<{
    id: string
    username: string
    email: string
  }>
  onUpdate?: (updatedTask: Task) => void
  currentUser?: {
    id?: string
    role?: string
    organization_id?: string
  }
}

export interface AuditLog {
  id: string
  user?: {
    id: string
    username: string
  }
  action: string
  changes?: unknown
  created_at: string
}
