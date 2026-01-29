export interface AiDisputeEvaluationState {
  id: string
  status: string
  disputeId: string
  caseFileId: string | null
  sourceType: string | null
  sourceId: string | null
}

export interface AiDisputeCallbackUpdate {
  status: 'completed' | 'failed'
  recommendation: string | null
  confidenceScore: number | null
  summary: string | null
  responsePayload: Record<string, unknown>
  errorMessage: string | null
}

export interface AiDisputeFeedbackWrite {
  evaluationId: string
  disputeId: string
  adminId: string
  feedbackType: 'accepted' | 'partially_accepted' | 'rejected' | 'insufficient_data'
  adminNotes: string | null
  finalDecision: string
  finalRationale: string
  aiWasHelpful: boolean
  aiCorrectPoints: Record<string, unknown>
  aiMissedPoints: Record<string, unknown>
}

export interface AiDisputePersistenceSession {
  loadEvaluation(evaluationId: string): Promise<AiDisputeEvaluationState | null>
  updateEvaluation(evaluationId: string, update: AiDisputeCallbackUpdate): Promise<void>
  loadSourceStatus(sourceType: string, sourceId: string): Promise<string | null>
  transitionSourceStatus(
    sourceType: string,
    sourceId: string,
    expectedStatus: string,
    nextStatus: string
  ): Promise<void>
  createFeedback(input: AiDisputeFeedbackWrite): Promise<Record<string, unknown>>
}

/**
 * Transaction boundary for AI-dispute callback and feedback persistence.
 * Commands own validation/status policy; infrastructure owns row locks and SQL.
 */
export interface AiDisputeUnitOfWork {
  run<T>(work: (session: AiDisputePersistenceSession) => Promise<T>): Promise<T>
}
