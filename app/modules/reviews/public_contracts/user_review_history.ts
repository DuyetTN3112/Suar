export type UserReviewHistoryDirection = 'received' | 'sent'
export type UserReviewHistoryKind =
  | 'task_received'
  | 'task_sent'
  | 'manager_received'
  | 'manager_sent'
  | 'environment_received'
  | 'environment_sent'

export interface UserReviewHistoryItem {
  id: string
  direction: UserReviewHistoryDirection
  kind: UserReviewHistoryKind
  title: string
  contextLabel: string
  counterpartLabel: string
  status: string
  rating: number | null
  comment: string | null
  submittedAt: string | null
  detailUrl: string
}

export interface UserReviewHistoryResult {
  received: UserReviewHistoryItem[]
  sent: UserReviewHistoryItem[]
  stats: {
    received: number
    sent: number
  }
}
