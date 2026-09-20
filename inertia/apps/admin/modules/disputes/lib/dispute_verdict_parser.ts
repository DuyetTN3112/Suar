import type { AiEvaluation, Dispute } from '../types/dispute_resolve_types.js'

export type FinalDecision =
  | 'uphold_review'
  | 'adjust_score'
  | 'request_re_review'
  | 'dismiss_dispute'
  | 'partially_accept'

export type AssessedDifficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'unknown'

export interface ComplexityAssessment {
  declaredDifficulty: string | null
  assessedDifficulty: AssessedDifficulty
  status: 'supported' | 'adjusted' | 'insufficient_evidence'
  basis: string[]
  evidenceSummary: string | null
  profileEffect: string | null
  adminActionRequired: boolean
}

export type ProfileAssessmentStatus =
  | 'not_eligible_by_contract'
  | 'proposal_ready'
  | 'insufficient_evidence'

export interface CapabilityProposal {
  capabilityId: string
  capabilityName: string
  declaredMinimumLevel: string | null
  declaredTargetLevel: string | null
  proposedObservedLevel: string | null
  status: 'supported' | 'higher_evidence' | 'lower_evidence' | 'insufficient_evidence'
  evidenceRefs: string[]
  rationale: string
  proposedTaskDifficultyLevel: string | null
  taskDifficultyStatus:
    | 'supported'
    | 'higher_evidence'
    | 'lower_evidence'
    | 'insufficient_evidence'
    | null
  taskDifficultyEvidenceRefs: string[]
  taskDifficultyRationale: string | null
}

export interface ProfileAssessment {
  status: ProfileAssessmentStatus
  workClaim: {
    statement: string
    action: string
    object: string
    ownershipLevel: string | null
    contextSummary: string
    outcomeSummary: string
    evidenceRefs: string[]
  } | null
  capabilityProposals: CapabilityProposal[]
  profileEffect: string
  blockers: string[]
}

export interface StructuredVerdict {
  recommendation: string | null
  verdict: string | null
  rationale: string | null
  evidenceSummary: string | null
  scoreOrReviewDelta: string | null
  actionItems: string[]
  unknowns: string | null
  complexityAssessment: ComplexityAssessment | null
  profileAssessment: ProfileAssessment | null
}

export interface DebateTraceEntry {
  type?: string
  stage?: string
  roleId?: string
  fromRole?: string
  summary?: string
  evidence?: string
  visibility?: string
  round?: number
  audit?: {
    template_role_id?: string
    template_file?: string | null
    selection_reason?: string
    matched_tags?: string[]
    mandate?: string
    context_used?: string[]
    checked_claims?: Array<{
      claim?: string
      evidence_refs?: string[]
      assessment?: string
      certainty?: string
    }>
    contribution?: string
  }
  presentation?: {
    actor?: string
    title?: string
    purpose?: string
    summary?: string
    findings?: Array<{
      claim?: string
      evidence_refs?: string[]
      assessment?: string
      certainty?: string
    }>
    unknowns?: string[]
    confidence?: number
  }
}

export interface AnalysisBlock {
  kind: 'heading' | 'bullet' | 'paragraph' | 'detail'
  text: string
  label?: string
}

export interface DisputeResolveTabProps {
  dispute: Dispute
  aiEvaluations: AiEvaluation[]
  resolving: boolean
  finalDecision: FinalDecision
  finalRationale: string
  onAcceptAi: () => void
  approvingProfileProposal?: boolean
  onApproveProfileProposal?: (evaluationId: string, proposalIndex: number) => void
  onResolve: () => void
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(stringValue).filter((item): item is string => item !== null) : []
}

export function parseComplexityAssessment(value: unknown): ComplexityAssessment | null {
  if (!isRecord(value)) return null
  const assessedDifficulty = stringValue(value.assessed_difficulty)
  const status = stringValue(value.assessment_status)
  if (
    !['easy', 'medium', 'hard', 'expert', 'unknown'].includes(assessedDifficulty ?? '') ||
    !['supported', 'adjusted', 'insufficient_evidence'].includes(status ?? '')
  ) return null
  return {
    declaredDifficulty: stringValue(value.declared_difficulty),
    assessedDifficulty: assessedDifficulty as AssessedDifficulty,
    status: status as ComplexityAssessment['status'],
    basis: stringList(value.basis),
    evidenceSummary: stringValue(value.evidence_summary),
    profileEffect: stringValue(value.profile_effect),
    adminActionRequired: value.admin_action_required === true,
  }
}

export function parseProfileAssessment(value: unknown): ProfileAssessment | null {
  if (!isRecord(value)) return null
  const status = stringValue(value.status)
  const capabilityProposals = Array.isArray(value.capability_proposals)
    ? value.capability_proposals.flatMap((entry) => {
        if (!isRecord(entry)) return []
        const proposalStatus = stringValue(entry.assessment_status)
        const capabilityId = stringValue(entry.capability_id)
        const capabilityName = stringValue(entry.capability_name)
        const rationale = stringValue(entry.rationale)
        if (
          !capabilityId ||
          !capabilityName ||
          !rationale ||
          !['supported', 'higher_evidence', 'lower_evidence', 'insufficient_evidence'].includes(
            proposalStatus ?? ''
          )
        ) return []
        return [{
          capabilityId,
          capabilityName,
          declaredMinimumLevel: stringValue(entry.declared_minimum_level),
          declaredTargetLevel: stringValue(entry.declared_target_level),
          proposedObservedLevel: stringValue(entry.proposed_observed_level),
          status: proposalStatus as CapabilityProposal['status'],
          evidenceRefs: stringList(entry.evidence_refs),
          rationale,
          proposedTaskDifficultyLevel: stringValue(entry.proposed_task_difficulty_level),
          taskDifficultyStatus: (() => {
            const val = stringValue(entry.task_difficulty_assessment_status)
            return ['supported', 'higher_evidence', 'lower_evidence', 'insufficient_evidence'].includes(
              val ?? ''
            )
              ? (val as CapabilityProposal['taskDifficultyStatus'])
              : null
          })(),
          taskDifficultyEvidenceRefs: stringList(entry.task_difficulty_evidence_refs),
          taskDifficultyRationale: stringValue(entry.task_difficulty_rationale),
        }]
      })
    : []
  const rawClaim = value.work_claim
  const workClaim = isRecord(rawClaim)
    ? (() => {
        const statement = stringValue(rawClaim.statement)
        const action = stringValue(rawClaim.action)
        const object = stringValue(rawClaim.object)
        const contextSummary = stringValue(rawClaim.context_summary)
        const outcomeSummary = stringValue(rawClaim.outcome_summary)
        if (!statement || !action || !object || !contextSummary || !outcomeSummary) return null
        return {
          statement,
          action,
          object,
          ownershipLevel: stringValue(rawClaim.ownership_level),
          contextSummary,
          outcomeSummary,
          evidenceRefs: stringList(rawClaim.evidence_refs),
        }
      })()
    : null
  if (
    !['not_eligible_by_contract', 'proposal_ready', 'insufficient_evidence'].includes(
      status ?? ''
    ) ||
    value.schema_version !== 'suar.ai.profile_assessment.v1' ||
    value.requires_human_approval !== true ||
    value.profile_mutation_permitted !== false ||
    !stringValue(value.profile_effect)
  ) return null
  return {
    status: status as ProfileAssessmentStatus,
    workClaim,
    capabilityProposals,
    profileEffect: stringValue(value.profile_effect) ?? '',
    blockers: stringList(value.blockers),
  }
}

export function parseStructuredVerdict(value: unknown): StructuredVerdict | null {
  if (!value) return null
  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!isRecord(parsed)) return null
  return {
    recommendation: stringValue(parsed.recommendation),
    verdict: stringValue(parsed.verdict),
    rationale: stringValue(parsed.rationale),
    evidenceSummary: stringValue(parsed.evidence_summary),
    scoreOrReviewDelta: stringValue(parsed.score_or_review_delta),
    actionItems: stringList(parsed.action_items ?? parsed.actionItems),
    unknowns: stringValue(parsed.unknowns_or_missing_evidence),
    complexityAssessment: parseComplexityAssessment(parsed.complexity_assessment),
    profileAssessment: parseProfileAssessment(parsed.profile_assessment),
  }
}
