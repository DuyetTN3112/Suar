import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export interface TalentExplainabilitySessionSourceRow {
  id: string
  reviewee_id: string
  status: string
  confirmations: unknown
  updated_at: Date | string
}

export interface TalentExplainabilityDisputeSourceRow {
  id: string
  review_session_id: string
  status: string
  final_decision: string | null
  updated_at: Date | string
}

export interface TalentExplainabilityRatingSourceRow {
  id: string
  review_session_id: string
  skill_id: string
  confidence: string | null
  review_status: string
  is_fraud: boolean
  superseded_by: string | null
  submitted_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

export async function listTalentExplainabilitySessions(
  revieweeUserIds: string[],
  trx?: TransactionClientContract
): Promise<TalentExplainabilitySessionSourceRow[]> {
  if (revieweeUserIds.length === 0) return []

  const client = trx ?? db
  return (await client
    .from('review_sessions')
    .whereIn('reviewee_id', revieweeUserIds)
    .select('id', 'reviewee_id', 'status', 'confirmations', 'updated_at')
    .orderBy('reviewee_id', 'asc')
    .orderBy('updated_at', 'desc')
    .orderBy('id', 'desc')) as TalentExplainabilitySessionSourceRow[]
}

export async function listTalentExplainabilityDisputes(
  reviewSessionIds: string[],
  trx?: TransactionClientContract
): Promise<TalentExplainabilityDisputeSourceRow[]> {
  if (reviewSessionIds.length === 0) return []

  const client = trx ?? db
  return (await client
    .from('review_disputes')
    .whereIn('review_session_id', reviewSessionIds)
    .select('id', 'review_session_id', 'status', 'final_decision', 'updated_at')
    .orderBy('review_session_id', 'asc')
    .orderBy('updated_at', 'desc')
    .orderBy('id', 'desc')) as TalentExplainabilityDisputeSourceRow[]
}

export async function listTalentExplainabilityRatings(
  reviewSessionIds: string[],
  trx?: TransactionClientContract
): Promise<TalentExplainabilityRatingSourceRow[]> {
  if (reviewSessionIds.length === 0) return []

  const client = trx ?? db
  return (await client
    .from('skill_reviews')
    .whereIn('review_session_id', reviewSessionIds)
    .select(
      'id',
      'review_session_id',
      'skill_id',
      'confidence',
      'review_status',
      'is_fraud',
      'superseded_by',
      'submitted_at',
      'created_at',
      'updated_at'
    )
    .orderBy('review_session_id', 'asc')
    .orderBy('submitted_at', 'desc')
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')) as TalentExplainabilityRatingSourceRow[]
}

export async function getTalentExplainabilitySourceRevision(
  trx: TransactionClientContract
): Promise<string> {
  const result: unknown = await trx.rawQuery(
    `SELECT nextval('public.talent_explainability_source_revision_seq')::text AS source_revision`
  )
  const revision = (
    result as { rows?: Array<{ source_revision?: string }> }
  ).rows?.[0]?.source_revision
  if (!revision || !/^\d+$/.test(revision)) {
    throw new InvariantViolationException(
      'Unable to allocate talent explainability source revision'
    )
  }
  return revision
}

export async function lockTalentExplainabilityProjectionUsers(
  revieweeUserIds: string[],
  trx: TransactionClientContract
): Promise<void> {
  for (const userId of [...new Set(revieweeUserIds)].sort()) {
    await trx.rawQuery(
      'SELECT pg_advisory_xact_lock(hashtextextended(?, 91337))',
      [userId]
    )
  }
}
