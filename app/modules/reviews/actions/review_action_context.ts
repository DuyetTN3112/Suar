export interface ReviewActionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
}

export interface AuthenticatedReviewActionContext extends ReviewActionContext {
  readonly userId: string
}

export function makeSystemReviewActionContext(systemUserId: string): AuthenticatedReviewActionContext {
  return {
    userId: systemUserId,
    ip: '0.0.0.0',
    userAgent: 'system',
    organizationId: null,
  }
}
