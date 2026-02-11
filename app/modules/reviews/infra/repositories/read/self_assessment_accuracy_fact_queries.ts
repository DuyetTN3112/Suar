import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface SelfAssessmentAccuracySourceRow {
  task_assignment_id: string
  review_session_id: string
  reviewee_id: string
  session_status: string
  confirmations: unknown
  self_score: number | string | null
  reviewed_score: number | string | null
  review_completed_at: Date | string | null
}

export interface SelfAssessmentAccuracyDisputeSourceRow {
  id: string
  review_session_id: string
  status: string
  final_decision: string | null
  updated_at: Date | string
}

export async function listSelfAssessmentAccuracySourceRows(
  userId: string,
  trx?: TransactionClientContract
): Promise<SelfAssessmentAccuracySourceRow[]> {
  const client = trx ?? db
  return (await client
    .from('task_self_assessments as tsa')
    .join('review_sessions as rs', 'rs.task_assignment_id', 'tsa.task_assignment_id')
    .where('tsa.user_id', userId)
    .where('rs.reviewee_id', userId)
    .select(
      'tsa.task_assignment_id',
      'rs.id as review_session_id',
      'rs.reviewee_id',
      'rs.status as session_status',
      'rs.confirmations',
      'tsa.overall_satisfaction as self_score',
      'rs.overall_quality_score as reviewed_score',
      'rs.completed_at as review_completed_at'
    )
    .orderByRaw('rs.completed_at ASC NULLS LAST')
    .orderBy('tsa.task_assignment_id', 'asc')
    .orderBy('rs.id', 'asc')) as SelfAssessmentAccuracySourceRow[]
}

export async function listSelfAssessmentAccuracyDisputeRows(
  reviewSessionIds: string[],
  trx?: TransactionClientContract
): Promise<SelfAssessmentAccuracyDisputeSourceRow[]> {
  if (reviewSessionIds.length === 0) return []

  const client = trx ?? db
  return (await client
    .from('review_disputes')
    .whereIn('review_session_id', reviewSessionIds)
    .select('id', 'review_session_id', 'status', 'final_decision', 'updated_at')
    .orderBy('review_session_id', 'asc')
    .orderBy('updated_at', 'desc')
    .orderBy('id', 'desc')) as SelfAssessmentAccuracyDisputeSourceRow[]
}
