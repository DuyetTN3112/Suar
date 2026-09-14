import db from '@adonisjs/lucid/services/db'

import type {
  CacheInvalidationOutboxBacklog,
  CacheInvalidationOutboxOperationalStatus,
} from '#modules/cache/public_contracts/invalidation-outbox/cache_invalidation_outbox_types'

export function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '42P01'
  )
}

export class PostgresCacheInvalidationOutboxStatusReader {
  async operationalStatus(
    now: Date = new Date()
  ): Promise<CacheInvalidationOutboxOperationalStatus> {
    try {
      const rawResult: unknown = await db.rawQuery(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE status = 'leased') AS leased,
          COUNT(*) FILTER (WHERE status = 'pending' AND attempt_count > 0) AS retry_pending,
          COUNT(*) FILTER (WHERE status = 'dead_letter') AS dead_letter,
          COUNT(*) FILTER (WHERE status = 'processed') AS processed,
          MIN(created_at) FILTER (
            WHERE status IN ('pending', 'leased')
          ) AS oldest_pending_at
        FROM cache_invalidation_outbox
      `)
      const row = (
        rawResult as {
          rows?: Array<{
            pending: number | string
            leased: number | string
            retry_pending: number | string
            dead_letter: number | string
            processed: number | string
            oldest_pending_at: Date | string | null
          }>
        }
      ).rows?.[0]
      const oldestPendingAt = row?.oldest_pending_at ? new Date(row.oldest_pending_at) : null

      return {
        configured: true,
        pending: Number(row?.pending ?? 0),
        leased: Number(row?.leased ?? 0),
        retryPending: Number(row?.retry_pending ?? 0),
        deadLetter: Number(row?.dead_letter ?? 0),
        processed: Number(row?.processed ?? 0),
        oldestPendingAgeMs:
          oldestPendingAt === null ? null : Math.max(0, now.getTime() - oldestPendingAt.getTime()),
      }
    } catch (error) {
      if (isUndefinedTableError(error)) {
        return {
          configured: false,
          pending: 0,
          leased: 0,
          retryPending: 0,
          deadLetter: 0,
          processed: 0,
          oldestPendingAgeMs: null,
        }
      }
      throw error
    }
  }

  async backlog(): Promise<CacheInvalidationOutboxBacklog> {
    try {
      const row = (await db
        .from('cache_invalidation_outbox')
        .select(
          db.raw(`COUNT(*) FILTER (WHERE status = 'pending')::int AS pending`),
          db.raw(`COUNT(*) FILTER (WHERE status = 'leased')::int AS leased`),
          db.raw(`COUNT(*) FILTER (WHERE status = 'dead_letter')::int AS dead_letter`),
          db.raw(`
            MIN(created_at) FILTER (
              WHERE status IN ('pending', 'leased')
            ) AS oldest_outstanding_at
          `)
        )
        .first()) as
        | {
            pending: number | string
            leased: number | string
            dead_letter: number | string
            oldest_outstanding_at: Date | string | null
          }
        | undefined

      return {
        configured: true,
        pending: Number(row?.pending ?? 0),
        leased: Number(row?.leased ?? 0),
        deadLetter: Number(row?.dead_letter ?? 0),
        oldestOutstandingAt: row?.oldest_outstanding_at
          ? new Date(row.oldest_outstanding_at)
          : null,
      }
    } catch (error) {
      if (isUndefinedTableError(error)) {
        return {
          configured: false,
          pending: 0,
          leased: 0,
          deadLetter: 0,
          oldestOutstandingAt: null,
        }
      }
      throw error
    }
  }
}
