import db from '@adonisjs/lucid/services/db'

import type {
  AiDisputePersistenceSession,
  AiDisputeUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/ai_dispute_unit_of_work'

const SOURCE_TABLES: Record<string, string> = {
  review_dispute: 'review_disputes',
  sprint_review_dispute: 'sprint_review_disputes',
  sprint_reverse_review_workflow: 'sprint_reverse_review_workflows',
  task_review_workflow: 'task_review_workflows',
}

export default class LucidAiDisputeUnitOfWork implements AiDisputeUnitOfWork {
  run<T>(work: (session: AiDisputePersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction(async (transaction) => {
      const session: AiDisputePersistenceSession = {
        loadEvaluation: async (evaluationId) => {
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
              }
            | undefined
          return row
            ? {
                id: row.id,
                status: row.status,
                disputeId: row.dispute_id,
                caseFileId: row.case_file_id,
                sourceType: row.source_type,
                sourceId: row.source_id,
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
