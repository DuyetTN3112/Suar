import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte'

export interface TaskReviewWorkflowMessage {
  id: string
  body: string
  created_at: string
  author_id: string
  author_name: string | null
  message_type?: string
}

export interface TaskReviewWorkflowReviewer {
  reviewer_id: string
  reviewer_name: string | null
  reviewer_role: string
  status: 'pending' | 'submitted' | 'waived'
  priority_rank: number
}

export interface TaskReviewWorkflowDetail {
  task: Record<string, unknown>
  workflow: Record<string, unknown> | null
  reviewers: TaskReviewWorkflowReviewer[]
  comments: TaskReviewWorkflowMessage[]
  reviewMessages: TaskReviewWorkflowMessage[]
  reviewAuthoringContext?: Record<string, unknown> | null
}

export interface TaskShowProps {
  shellMode?: 'app' | 'organization'
  baseRoute?: string
  task: TaskDetail
  permissions: {
    isCreator?: boolean
    isAssignee?: boolean
    canEdit: boolean
    canDelete: boolean
    canAssign: boolean
    canChangeStatus: boolean
    canComment?: boolean
    canApply: boolean
    canReviewApplications?: boolean
  }
  auditLogs: {
    id: string
    action: string
    timestamp: string | Date | null
    changes: {
      field: string
      oldValue: unknown
      newValue: unknown
    }[]
    user: { id: string; name: string; email: string | null } | null
  }[]
  taskReviewDetail?: TaskReviewWorkflowDetail | null
}

export const statusColors: Record<string, string> = {
  todo: 'bg-secondary text-secondary-foreground border border-border/50',
  in_progress: 'bg-muted text-foreground border border-border/50',
  in_review: 'bg-accent text-accent-foreground border border-primary/20',
  done: 'bg-primary/10 text-foreground border border-primary/20',
  cancelled: 'bg-destructive/10 text-destructive border border-destructive/20',
}

export const priorityColors: Record<string, string> = {
  low: 'bg-secondary text-secondary-foreground border border-border/50',
  medium: 'bg-muted text-foreground border border-border/50',
  high: 'bg-primary/10 text-foreground border border-primary/20',
  urgent: 'bg-destructive/10 text-destructive border border-destructive/20',
}

export const labelColors: Record<string, string> = {
  bug: 'bg-destructive/10 text-destructive border border-destructive/20',
  feature: 'bg-muted text-foreground border border-border/50',
  enhancement: 'bg-accent text-accent-foreground border border-primary/20',
  documentation: 'bg-primary/10 text-foreground border border-primary/20',
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
