import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { DatabaseId } from '#types/database'

export default class ReviewMetricsRepository {
  private readonly __instanceMarker = true

  static {
    void new ReviewMetricsRepository().__instanceMarker
  }

  static async listCompletedAssignmentsForPerformance(
    userId: DatabaseId,
    trx: TransactionClientContract
  ) {
    return trx
      .from('task_assignments as ta')
      .join('tasks as t', 't.id', 'ta.task_id')
      .where('ta.assignee_id', userId)
      .where('ta.assignment_status', 'completed')
      .whereNull('t.deleted_at')
      .select('ta.id', 'ta.completed_at', 'ta.actual_hours', 't.due_date', 't.difficulty')
  }

  static async listCompletedSessionQualityRows(userId: DatabaseId, trx: TransactionClientContract) {
    return trx
      .from('review_sessions')
      .where('reviewee_id', userId)
      .where('status', 'completed')
      .whereNotNull('overall_quality_score')
      .select('overall_quality_score')
  }

  static async listCompletedSessionsForTrust(userId: DatabaseId, trx: TransactionClientContract) {
    return trx
      .from('review_sessions as rs')
      .where('rs.reviewee_id', userId)
      .where('rs.status', 'completed')
      .select('rs.id', 'rs.created_at')
  }

  static async listSkillReviewTrustRows(sessionIds: DatabaseId[], trx: TransactionClientContract) {
    if (sessionIds.length === 0) {
      return []
    }

    return trx
      .from('skill_reviews as sr')
      .leftJoin('users as reviewer', 'reviewer.id', 'sr.reviewer_id')
      .whereIn('sr.review_session_id', sessionIds)
      .select(
        'sr.review_session_id',
        'sr.reviewer_type',
        'sr.assigned_level_code',
        trx.raw(
          "COALESCE((reviewer.credibility_data->>'credibility_score')::numeric, 50) AS reviewer_credibility_score"
        )
      )
  }

  static async countSessionsWithEvidence(sessionIds: DatabaseId[], trx: TransactionClientContract) {
    if (sessionIds.length === 0) {
      return [{ total: 0 }]
    }

    return trx
      .from('review_evidences')
      .whereIn('review_session_id', sessionIds)
      .countDistinct('review_session_id as total')
  }

  static async listCompletedSkillReviewRowsByReviewee(
    userId: DatabaseId,
    trx: TransactionClientContract
  ) {
    return trx
      .from('skill_reviews as sr')
      .join('review_sessions as rs', 'rs.id', 'sr.review_session_id')
      .leftJoin('users as reviewer', 'reviewer.id', 'sr.reviewer_id')
      .where('rs.reviewee_id', userId)
      .where('rs.status', 'completed')
      .select(
        'sr.skill_id',
        'sr.review_session_id',
        'sr.reviewer_type',
        'sr.assigned_level_code',
        'sr.created_at',
        trx.raw(
          "COALESCE((reviewer.credibility_data->>'credibility_score')::numeric, 50) AS reviewer_credibility_score"
        )
      )
  }

  static async listEvidenceCountsBySkill(userId: DatabaseId, trx: TransactionClientContract) {
    return trx
      .from('review_evidences as re')
      .join('review_sessions as rs', 'rs.id', 're.review_session_id')
      .join('skill_reviews as sr', 'sr.review_session_id', 'rs.id')
      .where('rs.reviewee_id', userId)
      .where('rs.status', 'completed')
      .groupBy('sr.skill_id')
      .select('sr.skill_id')
      .countDistinct('re.id as total')
  }
}
