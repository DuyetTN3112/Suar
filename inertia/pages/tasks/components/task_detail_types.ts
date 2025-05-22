import { Task } from '../types'

export interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  statuses: Array<{ id: number; name: string; color: string }>
  priorities: Array<{ id: number; name: string; color: string; value: number }>
  labels: Array<{ id: number; name: string; color: string }>
  users?: Array<{
    id: number
    first_name: string
    last_name: string
    full_name: string
    avatar?: string
  }>
  onUpdate?: (updatedTask: Task) => void
  currentUser?: {
    id?: string | number
    role?: string
    organization_id?: string | number
  }
}

export interface AuditLog {
  id: number
  user?: {
    id: number
    full_name: string
  }
  action: string
  changes?: any
  created_at: string
}
