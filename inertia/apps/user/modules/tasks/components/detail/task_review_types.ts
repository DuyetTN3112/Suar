import type { TaskCompletionReviewPackageProjection } from '@/apps/shared/reviews/task_completion_review_package'

export interface ReviewMessageRevision {
  id: string
  revision_number: number
  body: string
  editor_id: string
  editor_name: string | null
  created_at: string
}

export interface DetailUserMessage {
  id: string
  body: string
  created_at: string
  updated_at?: string | null
  author_id: string
  author_name: string | null
  message_type?: string
  parent_review_message_id?: string | null
  reviewee_decision?: 'accepted' | 'rejected' | null
  requires_reviewer_confirmation?: boolean
  reviewer_agreed_at?: string | null
  revision_count?: number
  revisions?: ReviewMessageRevision[]
}

export interface Reviewer {
  reviewer_id: string
  reviewer_name: string | null
  reviewer_role: string
  status: 'pending' | 'submitted' | 'waived'
  priority_rank: number
}

export interface TaskReviewWorkflowDetail {
  task: Record<string, unknown>
  assignment?: Record<string, unknown> | null
  workflow: Record<string, unknown> | null
  reviewers: Reviewer[]
  comments: DetailUserMessage[]
  reviewMessages: DetailUserMessage[]
  reviewAuthoringContext?: Record<string, unknown> | null
}

export type TaskReviewDetailPayload = TaskReviewWorkflowDetail

export interface TaskReviewWorkflowPanelProps {
  taskId: string
  projectId: string | null
  currentUserId: string | null
  taskDetailUrl: string
  detail: TaskReviewWorkflowDetail
  translate?: (key: string, params?: Record<string, unknown>, fallback?: string) => string
  showOrganizationContext?: boolean
  initialTab?: 'context' | 'review'
  canFinalizeResolvedWorkflow?: boolean
  loadTaskDetail?: (taskId: string) => Promise<Record<string, unknown> | null>
  loadReviewPackage?: (
    reportId: string,
    taskId: string,
    taskAssignmentId: string
  ) => Promise<TaskCompletionReviewPackageProjection | null>
}
