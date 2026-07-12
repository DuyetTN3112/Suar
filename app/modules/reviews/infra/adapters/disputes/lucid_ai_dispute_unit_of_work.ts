import db from '@adonisjs/lucid/services/db'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import type {
  AiDisputePersistenceSession,
  AiDisputeUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/ai_dispute_unit_of_work'
import { lockClassicReviewDisputeGovernance } from '#modules/reviews/infra/adapters/review-core/lucid_classic_review_governance_lock'
import { lockTaskReviewWorkflowGovernance } from '#modules/reviews/infra/adapters/task-review/lucid_task_review_workflow_governance_lock'

const SOURCE_TABLES: Record<string, string> = {
  review_dispute: 'review_disputes',
  sprint_review_dispute: 'sprint_review_disputes',
  sprint_reverse_review_workflow: 'sprint_reverse_review_workflows',
  task_review_workflow: 'task_review_workflows',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function requiresProfileAssessment(value: unknown): boolean {
  if (isRecord(value)) return isRecord(value['profile_assessment_contract'])
  if (typeof value !== 'string') return false
  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) && isRecord(parsed['profile_assessment_contract'])
  } catch {
    return false
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function requiresTaskDifficultyAssessment(value: unknown): boolean {
  const payload = typeof value === 'string' ? parseJson(value) : value
  if (!isRecord(payload)) return false
  const contract = payload['profile_assessment_contract']
  return (
    isRecord(contract) &&
    (contract['schema_version'] === 'suar.profile_assessment_contract.v2' ||
      contract['requires_task_difficulty_assessment'] === true)
  )
}

export default class LucidAiDisputeUnitOfWork implements AiDisputeUnitOfWork {
  run<T>(work: (session: AiDisputePersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction(async (transaction) => {
      const session: AiDisputePersistenceSession = {
        loadEvaluation: async (evaluationId) => {
          const pointer = (await transaction
            .from('ai_dispute_evaluations')
            .where('id', evaluationId)
            .select('source_type', 'source_id')
            .first()) as { source_type: string | null; source_id: string | null } | undefined
          if (!pointer) return null
          if (pointer.source_type === 'review_dispute' && pointer.source_id) {
            const governance = await lockClassicReviewDisputeGovernance(
              transaction,
              pointer.source_id
            )
            if (!governance) {
              throw new PersistedDataIntegrityException(
                'AI callback references a missing classic review dispute',
                { evaluationId, sourceId: pointer.source_id }
              )
            }
          } else if (pointer.source_type === 'task_review_workflow' && pointer.source_id) {
            const governance = await lockTaskReviewWorkflowGovernance(
              transaction,
              pointer.source_id
            )
            if (!governance) {
              throw new PersistedDataIntegrityException(
                'AI callback references a missing task review workflow',
                { evaluationId, sourceId: pointer.source_id }
              )
            }
          }
          const row = (await transaction
            .from('ai_dispute_evaluations')
            .where('id', evaluationId)
            .forUpdate()
            .first()) as
            | {
                id: string
                status: string
                dispute_id: string
                case_file_id: string | null
                source_type: string | null
                source_id: string | null
                request_payload: unknown
              }
            | undefined
          if (
            row &&
            (row.source_type !== pointer.source_type || row.source_id !== pointer.source_id)
          ) {
            throw new PersistedDataIntegrityException(
              'AI evaluation source changed while acquiring governance locks',
              { evaluationId }
            )
          }
          return row
            ? {
                id: row.id,
                status: row.status,
                disputeId: row.dispute_id,
                caseFileId: row.case_file_id,
                sourceType: row.source_type,
                sourceId: row.source_id,
                requiresProfileAssessment: requiresProfileAssessment(row.request_payload),
                requiresTaskDifficultyAssessment: requiresTaskDifficultyAssessment(
                  row.request_payload
                ),
              }
            : null
        },
        updateEvaluation: async (evaluationId, update) => {
          await transaction
            .from('ai_dispute_evaluations')
            .where('id', evaluationId)
            .update({
              status: update.status,
              recommendation: update.recommendation,
              confidence_score: update.confidenceScore,
              summary: update.summary,
              response_payload: JSON.stringify(update.responsePayload),
              error_message: update.errorMessage,
              completed_at: db.raw('NOW()'),
            })
        },
        loadSourceStatus: async (sourceType, sourceId) => {
          const table = SOURCE_TABLES[sourceType]
          if (!table) return null
          const row = (await transaction
            .from(table)
            .where('id', sourceId)
            .select('status')
            .first()) as { status: string } | undefined
          return row?.status ?? null
        },
        transitionSourceStatus: async (sourceType, sourceId, expectedStatus, nextStatus) => {
          const table = SOURCE_TABLES[sourceType]
          if (!table) return
          await transaction
            .from(table)
            .where('id', sourceId)
            .where('status', expectedStatus)
            .update({ status: nextStatus, updated_at: db.raw('NOW()') })
        },
        createFeedback: async (input) => {
          const [created] = (await transaction
            .table('ai_dispute_feedback')
            .insert({
              ai_evaluation_id: input.evaluationId,
              dispute_id: input.disputeId,
              admin_id: input.adminId,
              feedback_type: input.feedbackType,
              admin_notes: input.adminNotes,
              final_decision: input.finalDecision,
              final_rationale: input.finalRationale,
              ai_was_helpful: input.aiWasHelpful,
              ai_correct_points: JSON.stringify(input.aiCorrectPoints),
              ai_missed_points: JSON.stringify(input.aiMissedPoints),
            })
            .returning('*')) as Record<string, unknown>[]
          return created ?? {}
        },
      }
      return work(session)
    })
  }
}
