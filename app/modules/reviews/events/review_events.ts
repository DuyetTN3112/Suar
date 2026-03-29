
export interface ReviewSubmittedEvent {
  reviewSessionId: string
  reviewerId: string
  revieweeId: string
  taskId: string
  scores: Record<string, number>
}

export interface ReviewConfirmedEvent {
  confirmationId: string
  reviewSessionId: string
  revieweeId: string
  reviewerIds: string[]
  confirmedBy: string
  action: 'confirmed' | 'disputed'
}

export interface DisputeResolvedEvent {
  disputeId: string
  reviewSessionId: string
  revieweeId: string
  reviewerIds: string[]
  resolvedBy: string
  finalDecision: string
  profileUpdateAction?: string | null
  reviewerCredibilityAction?: string | null
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'review:submitted': ReviewSubmittedEvent
    'review:confirmed': ReviewConfirmedEvent
    'dispute:resolved': DisputeResolvedEvent
  }
}

