import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface AiProfileAssessmentApprovalCandidate {
  evaluationId: string
  sourceType: string | null
  sourceId: string | null
  evaluationStatus: string
  requestPayload: Record<string, unknown>
  responsePayload: Record<string, unknown>
  workflow: {
    id: string
    status: string
    taskId: string
    taskAssignmentId: string | null
    revieweeId: string | null
  } | null
}

export interface AiProfileCapabilityApprovalWrite {
  evaluationId: string
  workflowId: string
  taskId: string
  taskAssignmentId: string
  subjectUserId: string
  proposalIndex: number
  capabilityId: string
  capabilityName: string
  declaredMinimumLevel: string | null
  declaredTargetLevel: string | null
  approvedObservedLevel: string
  assessmentStatus: 'supported' | 'higher_evidence' | 'lower_evidence'
  assessedTaskDifficultyLevel: string | null
  taskDifficultyAssessmentStatus:
    | 'supported'
    | 'higher_evidence'
    | 'lower_evidence'
    | 'insufficient_evidence'
    | null
  workClaim: Record<string, unknown>
  proposalPayload: Record<string, unknown>
  evidenceRefs: string[]
  profileEffect: string
  sourcePayloadHash: string
  approvedBy: string
}

export interface AiProfileCapabilityApprovalRecord {
  id: string
  evaluationId: string
  proposalIndex: number
  approvedAt: Date
}

export interface AiProfileAssessmentApprovalPersistenceSession {
  findActorSystemRole(actorId: string): Promise<string | null | undefined>
  loadCandidateForUpdate(evaluationId: string): Promise<AiProfileAssessmentApprovalCandidate | null>
  createOrLoadCapabilityApproval(
    input: AiProfileCapabilityApprovalWrite,
    context: ReviewActionContext
  ): Promise<AiProfileCapabilityApprovalRecord>
}

export interface AiProfileAssessmentApprovalUnitOfWork {
  run<T>(
    work: (session: AiProfileAssessmentApprovalPersistenceSession) => Promise<T>
  ): Promise<T>
}
