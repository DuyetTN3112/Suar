import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { isCanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { AiDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/ai_dispute_unit_of_work'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ProcessAiDisputeCallbackDTO {
  evaluation_id: string
  review_dispute_id?: string
  case_file_id?: string
  source_id?: string
  status: string
  recommendation?: string
  confidence_score?: number
  summary?: string
  response_payload?: Record<string, unknown>
  error_message?: string
  timestamp: number
  signature: string
}

type ValidProcessAiDisputeCallbackDTO = ProcessAiDisputeCallbackDTO & {
  status: 'completed' | 'failed'
}

type JsonRecord = Record<string, unknown>

export interface ProcessCallbackResult {
  id: string
  dispute_id: string
  status: string
}

function validateCallbackPayload(
  dto: ProcessAiDisputeCallbackDTO
): asserts dto is ValidProcessAiDisputeCallbackDTO {
  const errors: Record<string, string> = {}

  if (!dto.evaluation_id) {
    errors['evaluation_id'] = 'evaluation_id is required'
  }

  if (dto.status !== 'completed' && dto.status !== 'failed') {
    errors['status'] = 'status must be completed or failed'
  }

  if (!Number.isFinite(dto.timestamp)) {
    errors['timestamp'] = 'timestamp is required'
  }

  if (!dto.signature) {
    errors['signature'] = 'signature is required'
  }

  if (Object.keys(errors).length > 0) {
    throw ValidationException.fields(errors)
  }
}

function hasIdentifier(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeActionItemAliases(record: JsonRecord): JsonRecord {
  const normalized = { ...record }
  if (normalized['action_items'] === undefined && normalized['actionItems'] !== undefined) {
    normalized['action_items'] = normalized['actionItems']
  }
  if (normalized['actionItems'] === undefined && normalized['action_items'] !== undefined) {
    normalized['actionItems'] = normalized['action_items']
  }
  return normalized
}

function normalizeResponsePayload(value: JsonRecord | undefined): JsonRecord {
  if (!value) return {}
  const normalized = normalizeActionItemAliases(value)
  for (const key of ['verdict', 'result', 'ai_target']) {
    if (isRecord(normalized[key])) {
      normalized[key] = normalizeActionItemAliases(normalized[key])
    }
  }
  return normalized
}

function verdictRecordFromPayload(payload: JsonRecord): JsonRecord {
  if (isRecord(payload['verdict'])) return payload['verdict']
  if (isRecord(payload['result'])) return payload['result']
  if (isRecord(payload['ai_target'])) return payload['ai_target']
  return payload
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function numberField(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const PROFILE_ASSESSMENT_STATUSES = new Set([
  'not_eligible_by_contract',
  'proposal_ready',
  'insufficient_evidence',
])
const CAPABILITY_PROPOSAL_STATUSES = new Set([
  'supported',
  'higher_evidence',
  'lower_evidence',
  'insufficient_evidence',
])

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function nullableCanonicalLevel(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === 'string' && isCanonicalProficiencyLevelCode(value.trim().toLowerCase()))
  )
}

function hasGroundedWorkClaim(value: JsonRecord): boolean {
  return (
    nonEmptyString(value['statement']) &&
    nonEmptyString(value['action']) &&
    nonEmptyString(value['object']) &&
    nullableString(value['ownership_level']) &&
    nonEmptyString(value['context_summary']) &&
    nonEmptyString(value['outcome_summary']) &&
    stringList(value['evidence_refs']) &&
    value['evidence_refs'].length > 0
  )
}

/**
 * Rejects a malformed advisory profile assessment before it is persisted. The
 * callback payload remains advisory: this schema never grants permission to
 * mutate a profile, a skill level, or an accomplishment.
 */
export function validateProfileAssessmentProposal(
  verdict: JsonRecord,
  options: { required?: boolean; taskDifficultyRequired?: boolean } = {}
): void {
  const assessment = verdict['profile_assessment']
  if (assessment === undefined) {
    // Historical evaluations were created before the profile-assessment
    // contract existed. They remain readable but cannot be projected.
    if (!options.required) return
    throw ValidationException.fields({
      'response_payload.verdict.profile_assessment':
        'AI phải trả về đánh giá hồ sơ theo hợp đồng đã nhận',
    })
  }
  if (!isRecord(assessment)) {
    throw ValidationException.fields({
      'response_payload.verdict.profile_assessment': 'profile_assessment must be an object',
    })
  }

  const status = assessment['status']
  const proposals = assessment['capability_proposals']
  const workClaim = assessment['work_claim']
  if (
    assessment['schema_version'] !== 'suar.ai.profile_assessment.v1' ||
    typeof status !== 'string' ||
    !PROFILE_ASSESSMENT_STATUSES.has(status) ||
    assessment['requires_human_approval'] !== true ||
    assessment['profile_mutation_permitted'] !== false ||
    typeof assessment['profile_effect'] !== 'string' ||
    !stringList(assessment['blockers']) ||
    !Array.isArray(proposals) ||
    (workClaim !== null && !isRecord(workClaim))
  ) {
    throw ValidationException.fields({
      'response_payload.verdict.profile_assessment':
        'profile_assessment must be a non-mutating governed proposal',
    })
  }
  if (
    (status === 'proposal_ready' &&
      (!isRecord(workClaim) || !hasGroundedWorkClaim(workClaim) || proposals.length === 0)) ||
    (status === 'not_eligible_by_contract' && (workClaim !== null || proposals.length !== 0))
  ) {
    throw ValidationException.fields({
      'response_payload.verdict.profile_assessment':
        'profile_assessment status does not match its proposal contents',
    })
  }
  for (const proposal of proposals) {
    const assessmentStatus = isRecord(proposal) ? proposal['assessment_status'] : null
    const evidenceRefs = isRecord(proposal) ? proposal['evidence_refs'] : null
    const proposedObservedLevel = isRecord(proposal)
      ? proposal['proposed_observed_level']
      : null
    const taskDifficultyLevel = isRecord(proposal)
      ? proposal['proposed_task_difficulty_level']
      : undefined
    const declaredMinimumLevel = isRecord(proposal)
      ? proposal['declared_minimum_level']
      : undefined
    const declaredTargetLevel = isRecord(proposal)
      ? proposal['declared_target_level']
      : undefined
    const taskDifficultyStatus = isRecord(proposal)
      ? proposal['task_difficulty_assessment_status']
      : undefined
    const taskDifficultyEvidenceRefs = isRecord(proposal)
      ? proposal['task_difficulty_evidence_refs']
      : undefined
    const taskDifficultyRationale = isRecord(proposal)
      ? proposal['task_difficulty_rationale']
      : undefined
    if (
      !isRecord(proposal) ||
      !nonEmptyString(proposal['capability_id']) ||
      !nonEmptyString(proposal['capability_name']) ||
      !nullableString(proposedObservedLevel) ||
      !CAPABILITY_PROPOSAL_STATUSES.has(String(assessmentStatus)) ||
      !stringList(evidenceRefs) ||
      !nonEmptyString(proposal['rationale']) ||
      proposal['requires_human_approval'] !== true
    ) {
      throw ValidationException.fields({
        'response_payload.verdict.profile_assessment':
        'each capability proposal must be grounded and require human approval',
      })
    }
    // `declared_target_level` belonged to the old three-level task contract.
    // New Task-review requests intentionally send only `declared_minimum_level`.
    // Accept the old field when present, but never require or infer it.
    if (
      declaredTargetLevel !== undefined &&
      !nullableCanonicalLevel(declaredTargetLevel)
    ) {
      throw ValidationException.fields({
        'response_payload.verdict.profile_assessment':
          'declared_target_level, when present for legacy data, must be a canonical level or null',
      })
    }
    if (
      status === 'proposal_ready' &&
      (!nonEmptyString(proposedObservedLevel) || evidenceRefs.length === 0)
    ) {
      throw ValidationException.fields({
        'response_payload.verdict.profile_assessment':
        'a ready capability proposal requires an observed level and evidence references',
      })
    }

    const hasTaskDifficultyAssessment =
      taskDifficultyLevel !== undefined ||
      taskDifficultyStatus !== undefined ||
      taskDifficultyEvidenceRefs !== undefined ||
      taskDifficultyRationale !== undefined
    if (options.taskDifficultyRequired || hasTaskDifficultyAssessment) {
      if (
        !nullableCanonicalLevel(declaredMinimumLevel) ||
        !nullableCanonicalLevel(taskDifficultyLevel) ||
        !CAPABILITY_PROPOSAL_STATUSES.has(String(taskDifficultyStatus)) ||
        !stringList(taskDifficultyEvidenceRefs) ||
        !nonEmptyString(taskDifficultyRationale)
      ) {
        throw ValidationException.fields({
          'response_payload.verdict.profile_assessment':
            'mỗi năng lực phải có nhận định riêng về độ khó thực tế của phần việc',
        })
      }
      if (
        taskDifficultyLevel !== null &&
        String(taskDifficultyStatus) === 'insufficient_evidence'
      ) {
        throw ValidationException.fields({
          'response_payload.verdict.profile_assessment':
            'không được gán level độ khó khi AI xác nhận chưa đủ căn cứ',
        })
      }
      if (
        taskDifficultyLevel === null &&
        String(taskDifficultyStatus) !== 'insufficient_evidence'
      ) {
        throw ValidationException.fields({
          'response_payload.verdict.profile_assessment':
            'độ khó thực tế thiếu level phải được đánh dấu là chưa đủ căn cứ',
        })
      }
    }
  }
}

export default class ProcessAiDisputeCallbackCommand extends BaseCommand<
  ProcessAiDisputeCallbackDTO,
  ProcessCallbackResult
> {
  constructor(
    private readonly cryptography: ReviewCryptography,
    private readonly disputes: AiDisputeUnitOfWork
  ) {
    super(makeSystemReviewActionContext('system'))
  }

  async execute(dto: ProcessAiDisputeCallbackDTO): Promise<ProcessCallbackResult> {
    return this.handle(dto)
  }

  async handle(dto: ProcessAiDisputeCallbackDTO): Promise<ProcessCallbackResult> {
    const secret = process.env['AI_CALLBACK_SECRET']
    if (!secret) {
      throw new UnauthorizedException('AI callback secret is not configured')
    }
    validateCallbackPayload(dto)
    // Verify callback timestamp & signature

    // Verify timestamp
    const nowSec = Math.floor(Date.now() / 1000)
    if (Math.abs(nowSec - dto.timestamp) > 300) {
      throw new UnauthorizedException('Callback timestamp expired or invalid')
    }

    // Verify signature
    if (
      !this.cryptography.verifyHmac(
        secret,
        `${dto.timestamp}:${dto.evaluation_id}:${dto.status}`,
        dto.signature
      )
    ) {
      throw new UnauthorizedException('Callback signature mismatch')
    }

    return this.disputes.run(async (session) => {
      const evaluation = await session.loadEvaluation(dto.evaluation_id)
      if (!evaluation) {
        throw new NotFoundException('AI evaluation not found')
      }

      if (
        (hasIdentifier(dto.review_dispute_id) &&
          dto.review_dispute_id.trim() !== evaluation.disputeId) ||
        (hasIdentifier(dto.case_file_id) &&
          evaluation.caseFileId !== null &&
          dto.case_file_id.trim() !== evaluation.caseFileId) ||
        (hasIdentifier(dto.source_id) &&
          dto.source_id.trim() !== (evaluation.sourceId ?? evaluation.disputeId))
      ) {
        throw new UnauthorizedException('Callback identifier mismatch')
      }

      if (evaluation.status !== 'queued' && evaluation.status !== 'processing') {
        if (evaluation.status === dto.status) {
          return {
            id: evaluation.id,
            dispute_id: evaluation.disputeId,
            status: evaluation.status,
          }
        }

        throw new ConflictException('AI evaluation is already terminal with a different status', {
          currentStatus: evaluation.status,
          callbackStatus: dto.status,
        })
      }

      const responsePayload = normalizeResponsePayload(dto.response_payload)
      const verdict = verdictRecordFromPayload(responsePayload)
      if (dto.status === 'completed') {
        validateProfileAssessmentProposal(verdict, {
          required: evaluation.requiresProfileAssessment,
          taskDifficultyRequired: evaluation.requiresTaskDifficultyAssessment,
        })
      }
      const recommendation =
        dto.recommendation ??
        stringField(verdict['recommendation']) ??
        stringField(verdict['final_decision']) ??
        stringField(verdict['decision_label'])
      const confidenceScore =
        dto.confidence_score ??
        numberField(verdict['confidence']) ??
        numberField(verdict['confidence_score']) ??
        numberField(verdict['confidenceScore'])
      const summary =
        dto.summary ??
        stringField(verdict['verdict']) ??
        stringField(verdict['summary']) ??
        stringField(verdict['rationale'])

      await session.updateEvaluation(dto.evaluation_id, {
        status: dto.status,
        recommendation: recommendation ?? null,
        confidenceScore: confidenceScore ?? null,
        summary: summary ?? null,
        responsePayload,
        errorMessage: dto.error_message ?? null,
      })

      const sourceType = evaluation.sourceType ?? 'review_dispute'
      const sourceId = evaluation.sourceId ?? evaluation.disputeId
      const sourceStatus = await session.loadSourceStatus(sourceType, sourceId)
      if (sourceStatus === 'ai_reviewing') {
        const nextStatus =
          dto.status === 'completed'
            ? 'admin_reviewing'
            : sourceType === 'task_review_workflow'
              ? 'ai_failed'
              : sourceType === 'review_dispute'
                ? 'admin_reviewing'
                : 'reported'
        await session.transitionSourceStatus(
          sourceType,
          sourceId,
          'ai_reviewing',
          nextStatus
        )
      }

      return {
        id: evaluation.id,
        dispute_id: evaluation.disputeId,
        status: dto.status,
      }
    })
  }
}
