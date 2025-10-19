export const SPRINT_REVERSE_REVIEW_STATUSES = [
  'awaiting_review',
  'in_review',
  'awaiting_response',
  'disputed',
  'reported',
  'ai_reviewing',
  'resolved',
  'done',
] as const

export type SprintReverseReviewStatus = (typeof SPRINT_REVERSE_REVIEW_STATUSES)[number]
export type SprintReverseReviewTargetType = 'assigner' | 'environment'

export interface SprintReverseReviewCard {
  id: string
  sprint_id: string
  project_id: string
  organization_id: string
  reviewer_id: string
  target_type: SprintReverseReviewTargetType
  target_user_id: string | null
  target_entity_id: string | null
  responder_id: string | null
  status: SprintReverseReviewStatus
  rating: number | null
  comment: string | null
  related_task_count: number
  related_tasks: Array<{
    id: string
    title: string
    status: string
    assigned_to: string | null
  }>
  reviewer: {
    id: string
    username: string | null
    email: string | null
  } | null
  target_user: {
    id: string
    username: string | null
    email: string | null
  } | null
  responder: {
    id: string
    username: string | null
    email: string | null
  } | null
  updated_at: string
}

export interface SprintReverseReviewColumn {
  status: SprintReverseReviewStatus
  title: string
  cards: SprintReverseReviewCard[]
}

export interface SprintReverseReviewBoardSection {
  columns: Record<SprintReverseReviewStatus, SprintReverseReviewColumn>
}

export interface SprintReverseReviewBoard {
  assigner: SprintReverseReviewBoardSection
  environment: SprintReverseReviewBoardSection
}

const STATUS_TITLES: Record<SprintReverseReviewStatus, string> = {
  awaiting_review: 'Chờ review',
  in_review: 'Đang review',
  awaiting_response: 'Chờ phản hồi',
  disputed: 'Tranh chấp',
  reported: 'Đã gửi report tranh chấp',
  ai_reviewing: 'AI đang phân xử',
  resolved: 'Admin đã phân xử',
  done: 'Done',
}

export function emptySprintReverseReviewBoardSection(): SprintReverseReviewBoardSection {
  const columns: Partial<Record<SprintReverseReviewStatus, SprintReverseReviewColumn>> = {}
  for (const status of SPRINT_REVERSE_REVIEW_STATUSES) {
    columns[status] = {
      status,
      title: STATUS_TITLES[status],
      cards: [],
    }
  }

  return { columns: columns as Record<SprintReverseReviewStatus, SprintReverseReviewColumn> }
}
