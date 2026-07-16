import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  buildPaginationMeta,
  decodeTimestampCursor,
  encodeTimestampCursor,
} from '#modules/pagination/public_contracts/pagination_public_api'
import FlaggedReview from '#modules/reviews/infra/models/review-core/flagged_review'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? FlaggedReview.query({ client: trx }) : FlaggedReview.query()
}

const applyStatusFilter = <T extends ReturnType<typeof baseQuery>>(query: T, status?: string): T => {
  if (status) {
    void query.where('status', status)
  }

  return query
}

interface FlaggedReviewFilters {
  reviewerIds?: string[]
  flagType?: string
  severity?: string
}

const applyAdditionalFilters = <T extends ReturnType<typeof baseQuery>>(
  query: T,
  filters?: FlaggedReviewFilters
): T => {
  if (!filters) {
    return query
  }

  if (filters.reviewerIds !== undefined) {
    if (filters.reviewerIds.length === 0) {
      void query.whereRaw('1 = 0')
      return query
    }
    void query.whereHas('skill_review', (skillReviewQuery) => {
      void skillReviewQuery.whereIn('reviewer_id', filters.reviewerIds ?? [])
    })
  }

  if (filters.flagType) {
    void query.where('flag_type', filters.flagType)
  }

  if (filters.severity) {
    void query.where('severity', filters.severity)
  }

  return query
}

export const paginateWithRelations = async (
  page: number,
  perPage: number,
  status?: string,
  after?: string,
  before?: string,
  trx?: TransactionClientContract,
  filters?: FlaggedReviewFilters
) => {
  const normalizedPage = Math.max(1, Math.trunc(page))
  const normalizedPerPage = Math.max(1, Math.trunc(perPage))
  const decodedCursor = decodeTimestampCursor(after)
  const decodedBeforeCursor = decodeTimestampCursor(before)
  const isBeforeWindow = Boolean(decodedBeforeCursor && !decodedCursor)

  const totalResult = await applyAdditionalFilters(
    applyStatusFilter(baseQuery(trx), status),
    filters
  ).count('* as total')
  const total = Number(totalResult[0]?.$extras['total'] ?? 0)
  const meta = buildPaginationMeta(total, {
    page: normalizedPage,
    perPage: normalizedPerPage,
  })

  const query = applyAdditionalFilters(applyStatusFilter(baseQuery(trx), status), filters)
    .preload('skill_review', (srQuery) => {
      void srQuery.preload('review_session')
    })
  if (decodedCursor) {
    void query.where((builder) => {
      void builder
        .where('detected_at', '<', decodedCursor.createdAt)
        .orWhere((nested) => {
          void nested.where('detected_at', decodedCursor.createdAt).where('id', '<', decodedCursor.id)
        })
    })
  } else if (decodedBeforeCursor) {
    void query.where((builder) => {
      void builder
        .where('detected_at', '>', decodedBeforeCursor.createdAt)
        .orWhere((nested) => {
          void nested
            .where('detected_at', decodedBeforeCursor.createdAt)
            .where('id', '>', decodedBeforeCursor.id)
        })
    })
  }

  const rows = await query
    .orderBy('detected_at', isBeforeWindow ? 'asc' : 'desc')
    .orderBy('id', isBeforeWindow ? 'asc' : 'desc')
    .limit(normalizedPerPage + 1)
  const hasOverflow = rows.length > normalizedPerPage
  const windowRows = hasOverflow ? rows.slice(0, normalizedPerPage) : rows
  const data = isBeforeWindow ? [...windowRows].reverse() : windowRows
  const firstRow = data[0]
  const lastRow = data[data.length - 1]

  return {
    data,
    total,
    perPage: normalizedPerPage,
    currentPage: decodedCursor || decodedBeforeCursor ? 1 : normalizedPage,
    lastPage: meta.lastPage,
    nextCursor:
      (isBeforeWindow || hasOverflow) && lastRow
        ? encodeTimestampCursor({
            createdAt: lastRow.detected_at.toISO() ?? lastRow.created_at.toISO() ?? new Date().toISOString(),
            id: lastRow.id,
          })
        : null,
    previousCursor:
      (decodedCursor || isBeforeWindow) && firstRow
        ? encodeTimestampCursor({
            createdAt: firstRow.detected_at.toISO() ?? firstRow.created_at.toISO() ?? new Date().toISOString(),
            id: firstRow.id,
          })
        : null,
    hasNextPage: isBeforeWindow ? Boolean(decodedBeforeCursor) : hasOverflow,
    hasPreviousPage: isBeforeWindow ? hasOverflow : Boolean(decodedCursor),
  }
}

export const findAdminDetail = async (
  id: string,
  trx?: TransactionClientContract
): Promise<FlaggedReview | null> => {
  return baseQuery(trx)
    .where('id', id)
    .preload('skill_review', (query) => {
      void query.preload('review_session')
    })
    .first()
}

export const countPending = async (trx?: TransactionClientContract): Promise<number> => {
  const rows = await applyStatusFilter(baseQuery(trx), 'pending').count('* as total')
  return Number(rows[0]?.$extras['total'] ?? 0)
}
