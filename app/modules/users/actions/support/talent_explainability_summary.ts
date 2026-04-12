import db from '@adonisjs/lucid/services/db'

import { ACTIVE_REVIEW_DISPUTE_STATUSES } from '#modules/reviews/constants/review_constants'

export interface TalentExplainabilitySummary {
  reviewedSkillsCount: number
  importedSkillsCount: number
  underDisputeSkillsCount: number
  latestConfidenceSignal: 'low' | 'medium' | 'high' | null
}

export async function buildTalentExplainabilitySummaryByUserId(userIds: string[]) {
  const summaries = new Map<string, TalentExplainabilitySummary>()
  if (userIds.length === 0) {
    return summaries
  }

  const [skillSourceRows, disputeRows, confidenceRows] = await Promise.all([
    db
      .from('user_skills')
      .whereIn('user_id', userIds)
      .groupBy('user_id', 'source')
      .select('user_id', 'source')
      .count('* as total'),
    db
      .from('review_disputes as rd')
      .join('skill_reviews as sr', 'sr.review_session_id', 'rd.review_session_id')
      .whereIn('rd.reviewee_id', userIds)
      .where('sr.is_fraud', false)
      .whereIn('rd.status', [...ACTIVE_REVIEW_DISPUTE_STATUSES])
      .groupBy('rd.reviewee_id')
      .countDistinct('sr.skill_id as total')
      .select('rd.reviewee_id'),
    db
      .from('skill_reviews as sr')
      .join('review_sessions as rs', 'rs.id', 'sr.review_session_id')
      .whereIn('rs.reviewee_id', userIds)
      .where('sr.is_fraud', false)
      .whereNotNull('sr.confidence')
      .distinctOn('rs.reviewee_id')
      .orderBy('rs.reviewee_id')
      .orderBy('sr.submitted_at', 'desc')
      .orderBy('sr.created_at', 'desc')
      .select('rs.reviewee_id', 'sr.confidence'),
  ])

  for (const userId of userIds) {
    summaries.set(userId, {
      reviewedSkillsCount: 0,
      importedSkillsCount: 0,
      underDisputeSkillsCount: 0,
      latestConfidenceSignal: null,
    })
  }

  for (const row of skillSourceRows as Array<{
    user_id: string
    source: string
    total: string | number
  }>) {
    const current = summaries.get(row.user_id)
    if (!current) continue

    const total = typeof row.total === 'number' ? row.total : Number(row.total)
    if (row.source === 'reviewed') {
      current.reviewedSkillsCount = total
    } else if (row.source === 'imported') {
      current.importedSkillsCount = total
    }
  }

  for (const row of disputeRows as Array<{ reviewee_id: string; total: string | number }>) {
    const current = summaries.get(row.reviewee_id)
    if (!current) continue

    current.underDisputeSkillsCount =
      typeof row.total === 'number' ? row.total : Number(row.total)
  }

  for (const row of confidenceRows as Array<{
    reviewee_id: string
    confidence: 'low' | 'medium' | 'high'
  }>) {
    const current = summaries.get(row.reviewee_id)
    if (!current) continue

    current.latestConfidenceSignal = row.confidence
  }

  return summaries
}
