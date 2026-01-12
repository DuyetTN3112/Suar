import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface ProfileReviewSessionSourceRow {
  id: string
  task_assignment_id: string
  reviewee_id: string
  status: string
  confirmations: unknown
  overall_quality_score: number | string | null
  updated_at: Date | string
}

export interface ProfileReviewDisputeSourceRow {
  id: string
  review_session_id: string
  status: string
  final_decision: string | null
  updated_at: Date | string
}

export interface ProfileReviewSkillRatingSourceRow {
  id: string
  review_session_id: string
  skill_id: string
  assigned_public_proficiency_code: string
  reviewer_type: string
  review_status: string
  is_fraud: boolean
  superseded_by: string | null
  updated_at: Date | string
}

export interface ProfileReviewEvidenceSourceRow {
  id: string
  review_session_id: string
  evidence_type: string
  url: string | null
  title: string | null
  verification_status: string | null
  is_sensitive: boolean | null
  updated_at: Date | string
}

export async function listProfileReviewSessions(
  revieweeUserId: string,
  taskAssignmentIds: string[],
  trx?: TransactionClientContract
): Promise<ProfileReviewSessionSourceRow[]> {
  if (taskAssignmentIds.length === 0) return []

  const client = trx ?? db
  return (await client
    .from('review_sessions')
    .where('reviewee_id', revieweeUserId)
    .whereIn('task_assignment_id', taskAssignmentIds)
    .select(
      'id',
      'task_assignment_id',
      'reviewee_id',
      'status',
      'confirmations',
      'overall_quality_score',
      'updated_at'
    )
    .orderBy('task_assignment_id', 'asc')
    .orderBy('updated_at', 'desc')
    .orderBy('id', 'desc')) as ProfileReviewSessionSourceRow[]
}

export async function listProfileReviewDisputes(
  reviewSessionIds: string[],
  trx?: TransactionClientContract
): Promise<ProfileReviewDisputeSourceRow[]> {
  if (reviewSessionIds.length === 0) return []

  const client = trx ?? db
  return (await client
    .from('review_disputes')
    .whereIn('review_session_id', reviewSessionIds)
    .select('id', 'review_session_id', 'status', 'final_decision', 'updated_at')
    .orderBy('review_session_id', 'asc')
    .orderBy('updated_at', 'desc')
    .orderBy('id', 'desc')) as ProfileReviewDisputeSourceRow[]
}

export async function listProfileReviewSkillRatings(
  reviewSessionIds: string[],
  trx?: TransactionClientContract
): Promise<ProfileReviewSkillRatingSourceRow[]> {
  if (reviewSessionIds.length === 0) return []

  const client = trx ?? db
  return (await client
    .from('skill_reviews')
    .whereIn('review_session_id', reviewSessionIds)
    .select(
      'id',
      'review_session_id',
      'skill_id',
      'assigned_public_proficiency_code',
      'reviewer_type',
      'review_status',
      'is_fraud',
      'superseded_by',
      'updated_at'
    )
    .orderBy('review_session_id', 'asc')
    .orderBy('created_at', 'asc')
    .orderBy('id', 'asc')) as ProfileReviewSkillRatingSourceRow[]
}

export async function listProfileReviewEvidences(
  reviewSessionIds: string[],
  trx?: TransactionClientContract
): Promise<ProfileReviewEvidenceSourceRow[]> {
  if (reviewSessionIds.length === 0) return []

  const client = trx ?? db
  return (await client
    .from('review_evidences')
    .whereIn('review_session_id', reviewSessionIds)
    .select(
      'id',
      'review_session_id',
      'evidence_type',
      'url',
      'title',
      'verification_status',
      'is_sensitive',
      'updated_at'
    )
    .orderBy('review_session_id', 'asc')
    .orderBy('created_at', 'asc')
    .orderBy('id', 'asc')) as ProfileReviewEvidenceSourceRow[]
}
