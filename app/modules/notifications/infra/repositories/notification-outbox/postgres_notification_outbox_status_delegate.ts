import db from '@adonisjs/lucid/services/db'

export interface NotificationOutboxOperationalStatus {
  pending: number
  leased: number
  retryPending: number
  deadLetter: number
  processed: number
  oldestPendingAgeMs: number | null
}

export async function queryNotificationOutboxOperationalStatus(
  now: Date = new Date(),
  countLimit?: number
): Promise<NotificationOutboxOperationalStatus> {
  if (
    countLimit !== undefined &&
    (!Number.isSafeInteger(countLimit) || countLimit < 1 || countLimit > 10_000_000)
  ) {
    throw new RangeError('Notification outbox operational count limit is invalid')
  }
  const rawResult: unknown =
    countLimit === undefined
      ? await db.rawQuery(`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending') AS pending,
            COUNT(*) FILTER (WHERE status = 'leased') AS leased,
            COUNT(*) FILTER (
              WHERE status = 'pending' AND attempt_count > 0
            ) AS retry_pending,
            COUNT(*) FILTER (WHERE status = 'dead_letter') AS dead_letter,
            COUNT(*) FILTER (WHERE status = 'processed') AS processed,
            MIN(created_at) FILTER (
              WHERE status IN ('pending', 'leased')
            ) AS oldest_pending_at
          FROM notification_outbox
        `)
      : await db.rawQuery(
          `
            SELECT
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_outbox
                  WHERE status = 'pending'
                  LIMIT ?
                ) AS bounded
              ) AS pending,
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_outbox
                  WHERE status = 'leased'
                  LIMIT ?
                ) AS bounded
              ) AS leased,
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_outbox
                  WHERE status = 'pending' AND attempt_count > 0
                  LIMIT ?
                ) AS bounded
              ) AS retry_pending,
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_outbox
                  WHERE status = 'dead_letter'
                  LIMIT ?
                ) AS bounded
              ) AS dead_letter,
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_outbox
                  WHERE status = 'processed'
                  LIMIT ?
                ) AS bounded
              ) AS processed,
              (
                SELECT created_at
                FROM notification_outbox
                WHERE status IN ('pending', 'leased')
                ORDER BY created_at
                LIMIT 1
              ) AS oldest_pending_at
          `,
          [countLimit, countLimit, countLimit, countLimit, countLimit]
        )
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
    pending: Number(row?.pending ?? 0),
    leased: Number(row?.leased ?? 0),
    retryPending: Number(row?.retry_pending ?? 0),
    deadLetter: Number(row?.dead_letter ?? 0),
    processed: Number(row?.processed ?? 0),
    oldestPendingAgeMs:
      oldestPendingAt === null ? null : Math.max(0, now.getTime() - oldestPendingAt.getTime()),
  }
}
