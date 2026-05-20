export interface ReviewModerationListInput {
  page: number
  perPage: number
  after?: string
  before?: string
  search?: string
  flagType?: string
  severity?: string
  status?: string
}

export interface ReviewModerationListItem {
  id: string
  reviewer: { id: string; username: string; email: string } | null
  reviewee: { id: string; username: string } | null
  reviewed_by: { id: string; username: string } | null
  comment: string | null
  flag_type: string
  severity: string
  status: string
  notes: string | null
  created_at: string
  reviewed_at: string | null
}

export interface ReviewModerationListResult {
  data: ReviewModerationListItem[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    cursor: {
      nextCursor: string | null
      previousCursor: string | null
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
  }
}

export interface ReviewModerationDetail {
  review: {
    id: string
    flag_type: string
    severity: string
    status: string
    notes: string | null
    detected_at: string | null
    reviewed_at: string | null
    reviewer: { id: string; username: string; email: string | null } | null
    reviewee: { id: string; username: string; email: string | null } | null
    moderator: { id: string; username: string; email: string | null } | null
    task: { id: string; title: string | null; description: string | null } | null
    skill: { id: string; name: string | null } | null
    comment: string | null
  }
  evidences: {
    id: string
    title: string | null
    url: string | null
    evidence_type: string
    description: string | null
    created_at: string | null
  }[]
}

export interface ReviewModerationActorContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
  readonly requestId?: string | null
  readonly traceId?: string | null
  readonly workflowId?: string | null
}

export abstract class ReviewModerationGateway {
  abstract list(input: ReviewModerationListInput): Promise<ReviewModerationListResult>
  abstract getDetail(id: string): Promise<ReviewModerationDetail | null>
  abstract countPending(): Promise<number>
  abstract resolve(
    input: {
      flaggedReviewId: string
      action: 'dismiss' | 'confirm'
      notes?: string
    },
    actor: ReviewModerationActorContext
  ): Promise<void>
}
