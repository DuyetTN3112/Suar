import type { TransactionClientContract } from '@adonisjs/lucid/types/database'


export default class ReviewMetricsRepository {
  private readonly __instanceMarker = true

  static {
    void new ReviewMetricsRepository().__instanceMarker
  }

  static async listCompletedAssignmentsForPerformance(
    userId: string,
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

  static async listCompletedSessionQualityRows(userId: string, trx: TransactionClientContract) {
    return trx
      .from('review_sessions')
      .where('reviewee_id', userId)
      .where((builder) =>
        builder.where('status', 'completed').orWhere((orBuilder) =>
          orBuilder.where('status', 'disputed').whereNotExists((subBuilder) =>
            subBuilder
              .from('review_disputes')
              .whereRaw('review_disputes.review_session_id = review_sessions.id')
              .whereIn('status', ['pending', 'collecting_evidence', 'admin_reviewing', 'ai_reviewing'])
          )
        )
      )
      .whereNotNull('overall_quality_score')
      .select('overall_quality_score')
  }

  static async listCompletedSessionsForTrust(userId: string, trx: TransactionClientContract) {
    return trx
      .from('review_sessions as rs')
      .where('rs.reviewee_id', userId)
      .where((builder) =>
        builder.where('rs.status', 'completed').orWhere((orBuilder) =>
          orBuilder.where('rs.status', 'disputed').whereNotExists((subBuilder) =>
            subBuilder
              .from('review_disputes')
              .whereRaw('review_disputes.review_session_id = rs.id')
              .whereIn('status', ['pending', 'collecting_evidence', 'admin_reviewing', 'ai_reviewing'])
          )
        )
      )
      .select('rs.id', 'rs.created_at')
  }

  static async listSkillReviewTrustRows(sessionIds: string[], trx: TransactionClientContract) {
    if (sessionIds.length === 0) {
      return []
    }

    return trx
      .from('skill_reviews as sr')
      .leftJoin('users as reviewer', 'reviewer.id', 'sr.reviewer_id')
      .whereIn('sr.review_session_id', sessionIds)
      .where('sr.is_fraud', false)
      .select(
        'sr.review_session_id',
        'sr.reviewer_type',
        'sr.assigned_level_code',
        trx.raw(
          "COALESCE((reviewer.credibility_data->>'credibility_score')::numeric, 50) AS reviewer_credibility_score"
        )
      )
  }

  static async countSessionsWithEvidence(sessionIds: string[], trx: TransactionClientContract) {
    if (sessionIds.length === 0) {
      return [{ total: 0 }]
    }

    return trx
      .from('review_evidences')
      .whereIn('review_session_id', sessionIds)
      .countDistinct('review_session_id as total')
  }

  static async listCompletedSkillReviewRowsByReviewee(
    userId: string,
    trx: TransactionClientContract
  ) {
    return trx
      .from('skill_reviews as sr')
      .join('review_sessions as rs', 'rs.id', 'sr.review_session_id')
      .leftJoin('users as reviewer', 'reviewer.id', 'sr.reviewer_id')
      .where('rs.reviewee_id', userId)
      .where('sr.is_fraud', false)
      .where((builder) =>
        builder.where('rs.status', 'completed').orWhere((orBuilder) =>
          orBuilder.where('rs.status', 'disputed').whereNotExists((subBuilder) =>
            subBuilder
              .from('review_disputes')
              .whereRaw('review_disputes.review_session_id = rs.id')
              .whereIn('status', ['pending', 'collecting_evidence', 'admin_reviewing', 'ai_reviewing'])
          )
        )
      )
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

  static async listEvidenceCountsBySkill(userId: string, trx: TransactionClientContract) {
    return trx
      .from('skill_review_evidence_links as srel')
      .join('skill_reviews as sr', 'sr.id', 'srel.skill_review_id')
      .join('review_sessions as rs', 'rs.id', 'sr.review_session_id')
      .where('rs.reviewee_id', userId)
      .where('sr.is_fraud', false)
      .where((builder) =>
        builder.where('rs.status', 'completed').orWhere((orBuilder) =>
          orBuilder.where('rs.status', 'disputed').whereNotExists((subBuilder) =>
            subBuilder
              .from('review_disputes')
              .whereRaw('review_disputes.review_session_id = rs.id')
              .whereIn('status', ['pending', 'collecting_evidence', 'admin_reviewing', 'ai_reviewing'])
          )
        )
      )
      .groupBy('sr.skill_id')
      .select('sr.skill_id')
      .countDistinct('srel.review_evidence_id as total')
  }
}
