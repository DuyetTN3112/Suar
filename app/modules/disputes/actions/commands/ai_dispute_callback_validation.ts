import type { ProcessAiDisputeCallbackDTO } from './process_ai_dispute_callback_command.js'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { isCanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'

export type ValidProcessAiDisputeCallbackDTO = ProcessAiDisputeCallbackDTO & {
  status: 'completed' | 'failed'
}

type JsonRecord = Record<string, unknown>

export function validateCallbackPayload(
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

export const PROFILE_ASSESSMENT_STATUSES = new Set([
  'not_eligible_by_contract',
  'proposal_ready',
  'insufficient_evidence',
])

export const CAPABILITY_PROPOSAL_STATUSES = new Set([
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

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
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
