import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import LucidAiDisputeUnitOfWork from '#modules/disputes/infra/adapters/lucid_ai_dispute_unit_of_work'
import { NodeReviewCryptography } from '#modules/reviews/infra/adapters/review-core/node_review_cryptography'
import { testId } from '#tests/helpers/test_utils'

export function signCallback(
  timestamp: number,
  evaluationId: string,
  status: 'completed' | 'failed',
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${evaluationId}:${status}`)
    .digest('hex')
}

export const reviewCryptography = new NodeReviewCryptography()
export const aiDisputeUnitOfWork = new LucidAiDisputeUnitOfWork()

export async function seedEvaluation(
  input: {
    evaluationStatus?: string
    disputeStatus?: string
    requiresProfileAssessment?: boolean
  } = {}
) {
  const disputeId = testId()
  const caseFileId = testId()
  const evaluationId = testId()

  await db.table('review_disputes').insert({
    id: disputeId,
    review_session_id: testId(),
    task_assignment_id: testId(),
    task_id: testId(),
    reviewee_id: testId(),
    opened_by: testId(),
    status: input.disputeStatus ?? 'ai_reviewing',
    dispute_reason: 'Need second opinion on evaluation',
    disputed_dimensions: JSON.stringify({ quality: true }),
    disputed_skill_reviews: JSON.stringify([]),
    requested_outcome: 'adjust_score',
  })

  await db.table('ai_dispute_evaluations').insert({
    id: evaluationId,
    dispute_id: disputeId,
    case_file_id: caseFileId,
    provider: 'ai_council',
    status: input.evaluationStatus ?? 'queued',
    request_payload: JSON.stringify({
      trace: 'fixture',
      ...(input.requiresProfileAssessment
        ? {
            profile_assessment_contract: {
              schema_version: 'suar.profile_assessment_contract.v1',
              profile_eligibility: true,
            },
          }
        : {}),
    }),
  })

  return { disputeId, caseFileId, evaluationId }
}

export interface AiDisputeEvaluationRow {
  status: string
  recommendation: string | null
  confidence_score: string | number | null
  summary: string | null
  response_payload?: string | Record<string, unknown> | null
}

export interface ReviewDisputeRow {
  status: string
}

export interface SprintReviewDisputeRow {
  status: string
}

export interface SprintReverseReviewWorkflowRow {
  status: string
}

export interface TaskReviewWorkflowRow {
  status: string
}
