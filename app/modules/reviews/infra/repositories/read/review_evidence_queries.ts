import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ReviewEvidence from '#modules/reviews/infra/models/review-submission/review_evidence'
import type { ReviewEvidenceRecord } from '#modules/reviews/types/review_records'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? ReviewEvidence.query({ client: trx }) : ReviewEvidence.query()
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type EvidenceOrigin = 'review' | 'submission'

interface EvidenceSourceRow extends ReviewEvidenceRecord {
  created_at: Date | string | null
  updated_at: Date | string | null
  origin: EvidenceOrigin
  origins: EvidenceOrigin[]
}

function sourceTimestamp(row: Pick<EvidenceSourceRow, 'created_at' | 'updated_at'>): number {
  const value = row.updated_at ?? row.created_at
  const millis = value instanceof Date ? value.getTime() : Date.parse(value ?? '')
  return Number.isFinite(millis) ? millis : 0
}

function mergeKey(row: EvidenceSourceRow): string {
  if (row.url || row.title) {
    return `${row.url ?? ''}\u0000${row.title ?? ''}`
  }
  return `${row.origin}:${row.id}`
}

function mergeEvidenceRows(rows: EvidenceSourceRow[]): EvidenceSourceRow[] {
  const merged = new Map<string, EvidenceSourceRow>()

  for (const row of rows) {
    const key = mergeKey(row)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, { ...row, origins: [...row.origins] })
      continue
    }

    const origins = Array.from(new Set([...existing.origins, ...row.origins])).sort()
    const preferred =
      row.origin === 'review' || sourceTimestamp(row) >= sourceTimestamp(existing) ? row : existing
    merged.set(key, {
      ...existing,
      ...preferred,
      origins,
      origin: origins.includes('review') ? 'review' : 'submission',
    })
  }

  return [...merged.values()].sort((left, right) => sourceTimestamp(right) - sourceTimestamp(left))
}

export const listBySession = (
  reviewSessionId: string,
  trx?: TransactionClientContract
): Promise<ReviewEvidence[]> => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reviewSessionId)) {
    return Promise.resolve([])
  }
  return baseQuery(trx).where('review_session_id', reviewSessionId).orderBy('created_at', 'desc')
}

export const paginateBySession = async (
  reviewSessionId: string,
  options: { page: number; perPage: number },
  trx?: TransactionClientContract
): Promise<{
  data: ReviewEvidence[]
  meta: { total: number; per_page: number; current_page: number; last_page: number }
}> => {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      reviewSessionId
    )
  ) {
    return {
      data: [],
      meta: { total: 0, per_page: options.perPage, current_page: options.page, last_page: 1 },
    }
  }

  const result = await baseQuery(trx)
    .where('review_session_id', reviewSessionId)
    .orderBy('created_at', 'desc')
    .paginate(options.page, options.perPage)

  return {
    data: result.all(),
    meta: {
      total: result.total,
      per_page: result.perPage,
      current_page: result.currentPage,
      last_page: result.lastPage,
    },
  }
}

export const paginateMergedBySession = async (
  reviewSessionId: string,
  options: { page: number; perPage: number },
  trx?: TransactionClientContract
): Promise<{
  data: ReviewEvidenceRecord[]
  meta: { total: number; per_page: number; current_page: number; last_page: number }
}> => {
  if (!UUID_PATTERN.test(reviewSessionId)) {
    return {
      data: [],
      meta: { total: 0, per_page: options.perPage, current_page: options.page, last_page: 1 },
    }
  }

  const client = trx ?? db
  const reviewRows = (await client
    .from('review_evidences')
    .where('review_session_id', reviewSessionId)
    .select(
      'id',
      'review_session_id',
      'evidence_type',
      'url',
      'title',
      'description',
      'uploaded_by',
      'verification_status',
      'is_sensitive',
      'created_at',
      'updated_at'
    )) as EvidenceSourceRow[]
  const submissionRows = (await client
    .from('review_sessions as rs')
    .join('task_submissions as ts', 'ts.task_assignment_id', 'rs.task_assignment_id')
    .join('task_submission_evidences as tse', 'tse.submission_id', 'ts.id')
    .where('rs.id', reviewSessionId)
    .select(
      'tse.id',
      'rs.id as review_session_id',
      'tse.evidence_type',
      'tse.url',
      'tse.title',
      'tse.description',
      'tse.uploaded_by',
      'tse.created_at'
    )
    .select(client.raw('tse.created_at as updated_at'))
    .select(client.raw('NULL::varchar as verification_status'))
    .select(client.raw('false as is_sensitive'))) as EvidenceSourceRow[]

  const merged = mergeEvidenceRows([
    ...submissionRows.map((row) => ({
      ...row,
      origin: 'submission' as const,
      origins: ['submission' as const],
    })),
    ...reviewRows.map((row) => ({
      ...row,
      origin: 'review' as const,
      origins: ['review' as const],
    })),
  ])
  const page = Math.max(1, options.page)
  const perPage = Math.max(1, options.perPage)
  const start = (page - 1) * perPage
  const data = merged.slice(start, start + perPage)
  const lastPage = Math.max(1, Math.ceil(merged.length / perPage))

  return {
    data,
    meta: {
      total: merged.length,
      per_page: perPage,
      current_page: page,
      last_page: lastPage,
    },
  }
}
