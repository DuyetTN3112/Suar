export const TASK_REVIEW_WORKFLOW_STATUSES = {
  AWAITING_REVIEW: 'awaiting_review',
  IN_REVIEW: 'in_review',
  AWAITING_RESPONSE: 'awaiting_response',
  DISPUTED: 'disputed',
  REPORTED: 'reported',
  AI_REVIEWING: 'ai_reviewing',
  AI_FAILED: 'ai_failed',
  ADMIN_REVIEWING: 'admin_reviewing',
  RESOLVED: 'resolved',
  DONE: 'done',
} as const

export type TaskReviewWorkflowStatus =
  (typeof TASK_REVIEW_WORKFLOW_STATUSES)[keyof typeof TASK_REVIEW_WORKFLOW_STATUSES]

export type TaskReviewBoardWorkflowStatus =
  | TaskReviewWorkflowStatus
  | 'not_opened'
  | 'out_of_model'

export const TASK_REVIEW_BOARD_COLUMNS = [
  { status: TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_REVIEW, label: 'Chờ review' },
  { status: TASK_REVIEW_WORKFLOW_STATUSES.IN_REVIEW, label: 'Đang review' },
  { status: TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE, label: 'Chờ phản hồi' },
  { status: TASK_REVIEW_WORKFLOW_STATUSES.DISPUTED, label: 'Tranh chấp' },
  { status: TASK_REVIEW_WORKFLOW_STATUSES.REPORTED, label: 'Đã gửi report tranh chấp' },
  { status: TASK_REVIEW_WORKFLOW_STATUSES.ADMIN_REVIEWING, label: 'Chờ admin quyết định' },
  { status: TASK_REVIEW_WORKFLOW_STATUSES.RESOLVED, label: 'Đã xử lý' },
  { status: TASK_REVIEW_WORKFLOW_STATUSES.DONE, label: 'Done' },
] as const satisfies readonly {
  status: TaskReviewWorkflowStatus
  label: string
}[]

export interface TaskReviewBoardCard {
  taskId: string
  workflowId: string | null
  status: TaskReviewWorkflowStatus
  workflowStatus: TaskReviewBoardWorkflowStatus
  title: string
  description: string | null
  taskStatus: string | null
  priority: string | null
  label: string | null
  difficulty: string | null
  dueDate: string | null
  estimatedTime: number | null
  revieweeId: string | null
  revieweeName: string | null
  creatorId: string | null
  creatorName: string | null
  projectId: string
  reviewCount: number
  requiredReviewCount: number | null
  lastActivityAt: string | null
  waitingOnMe: boolean
}

export interface TaskReviewBoardColumn {
  status: TaskReviewWorkflowStatus
  label: string
  cards: TaskReviewBoardCard[]
}

export interface TaskReviewBoardResult {
  projectId: string
  columns: TaskReviewBoardColumn[]
}

export function emptyTaskReviewBoardColumns(): TaskReviewBoardColumn[] {
  return TASK_REVIEW_BOARD_COLUMNS.map((column) => ({
    status: column.status,
    label: column.label,
    cards: [],
  }))
}
