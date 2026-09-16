import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { MAX_REPLAY_BATCH } from './postgres_notification_fanout_mapper.js'

import type {
  NotificationFanoutReplayRow,
  NotificationFanoutReplaySelector,
} from '#modules/notifications/domain/notification-outbox/notification_fanout'

export async function replayDeadLetters(
  selector: NotificationFanoutReplaySelector,
  now: Date,
  trx: TransactionClientContract
): Promise<NotificationFanoutReplayRow[]> {
  let query = trx
    .from('notification_fanout_targets')
    .select('id', 'job_id', 'sequence')
    .where('status', 'dead_letter')

  if (selector.ids !== undefined) {
    if (selector.ids.length === 0 || selector.ids.length > MAX_REPLAY_BATCH) {
      throw new RangeError(
        `Fanout replay ids must contain between 1 and ${MAX_REPLAY_BATCH} values`
      )
    }
    query = query.whereIn('id', selector.ids)
  }
  if (selector.jobId !== undefined) {
    query = query.where('job_id', selector.jobId)
  }
  if (selector.fromSequence !== undefined) {
    query = query.where('sequence', '>=', selector.fromSequence)
  }
  if (selector.toSequence !== undefined) {
    query = query.where('sequence', '<=', selector.toSequence)
  }
  if (selector.errorClass !== undefined) {
    query = query.where('last_error_class', selector.errorClass)
  }

  const rows = (await query
    .orderBy('sequence', 'asc')
    .limit(MAX_REPLAY_BATCH + 1)
    .forUpdate()) as Array<{
    id: string
    job_id: string
    sequence: number | string
  }>
  if (rows.length > MAX_REPLAY_BATCH) {
    throw new RangeError(
      `Fanout replay selector matches more than ${MAX_REPLAY_BATCH} rows; narrow the selector`
    )
  }
  if (rows.length === 0) {
    return []
  }

  await trx
    .from('notification_fanout_targets')
    .whereIn(
      'id',
      rows.map((row) => row.id)
    )
    .where('status', 'dead_letter')
    .update({
      status: 'pending',
      attempt_count: 0,
      available_at: now,
      locked_by: null,
      locked_until: null,
      lease_token: null,
      processed_at: null,
      dead_lettered_at: null,
      last_error_class: null,
      last_error_message: null,
      updated_at: now,
    })

  const replayCountByJob = new Map<string, number>()
  for (const row of rows) {
    replayCountByJob.set(row.job_id, (replayCountByJob.get(row.job_id) ?? 0) + 1)
  }
  for (const [jobId, replayedCount] of replayCountByJob) {
    await trx
      .from('notification_fanout_jobs')
      .where('id', jobId)
      .where('dead_letter_count', '>=', replayedCount)
      .update({
        dead_letter_count: trx.raw('dead_letter_count - ?', [replayedCount]),
        status: 'processing',
        completed_at: null,
        updated_at: now,
      })
  }

  return rows.map((row) => ({
    id: row.id,
    jobId: row.job_id,
    sequence: Number(row.sequence),
    previousStatus: 'dead_letter',
  }))
}

export async function queryOperationalStatus(
  now: Date = new Date(),
  countLimit?: number
): Promise<{
  pending: number
  leased: number
  retryPending: number
  processed: number
  deadLetter: number
  activeJobs: number
  completedJobs: number
  completedWithErrorsJobs: number
  oldestPendingAgeMs: number | null
}> {
  if (
    countLimit !== undefined &&
    (!Number.isSafeInteger(countLimit) || countLimit < 1 || countLimit > 10_000_000)
  ) {
    throw new RangeError('Notification fanout operational count limit is invalid')
  }
  const result: unknown =
    countLimit === undefined
      ? await db.rawQuery(`
          SELECT
            COUNT(*) FILTER (WHERE target.status = 'pending') AS pending,
            COUNT(*) FILTER (WHERE target.status = 'leased') AS leased,
            COUNT(*) FILTER (
              WHERE target.status = 'pending' AND target.attempt_count > 0
            ) AS retry_pending,
            COUNT(*) FILTER (WHERE target.status = 'processed') AS processed,
            COUNT(*) FILTER (WHERE target.status = 'dead_letter') AS dead_letter,
            MIN(target.created_at) FILTER (
              WHERE target.status IN ('pending', 'leased')
            ) AS oldest_pending_at,
            (
              SELECT COUNT(*)
              FROM notification_fanout_jobs
              WHERE status IN ('pending', 'processing')
            ) AS active_jobs,
            (
              SELECT COUNT(*)
              FROM notification_fanout_jobs
              WHERE status = 'completed'
            ) AS completed_jobs,
            (
              SELECT COUNT(*)
              FROM notification_fanout_jobs
              WHERE status = 'completed_with_errors'
            ) AS completed_with_errors_jobs
          FROM notification_fanout_targets AS target
        `)
      : await db.rawQuery(
          `
            SELECT
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_fanout_targets
                  WHERE status = 'pending'
                  LIMIT ?
                ) AS bounded
              ) AS pending,
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_fanout_targets
                  WHERE status = 'leased'
                  LIMIT ?
                ) AS bounded
              ) AS leased,
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_fanout_targets
                  WHERE status = 'pending' AND attempt_count > 0
                  LIMIT ?
                ) AS bounded
              ) AS retry_pending,
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_fanout_targets
                  WHERE status = 'processed'
                  LIMIT ?
                ) AS bounded
              ) AS processed,
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_fanout_targets
                  WHERE status = 'dead_letter'
                  LIMIT ?
                ) AS bounded
              ) AS dead_letter,
              (
                SELECT created_at
                FROM notification_fanout_targets
                WHERE status IN ('pending', 'leased')
                ORDER BY created_at
                LIMIT 1
              ) AS oldest_pending_at,
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_fanout_jobs
                  WHERE status IN ('pending', 'processing')
                  LIMIT ?
                ) AS bounded
              ) AS active_jobs,
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_fanout_jobs
                  WHERE status = 'completed'
                  LIMIT ?
                ) AS bounded
              ) AS completed_jobs,
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM notification_fanout_jobs
                  WHERE status = 'completed_with_errors'
                  LIMIT ?
                ) AS bounded
              ) AS completed_with_errors_jobs
          `,
          [
            countLimit,
            countLimit,
            countLimit,
            countLimit,
            countLimit,
            countLimit,
            countLimit,
            countLimit,
          ]
        )
  const row = (
    result as {
      rows?: Array<Record<string, string | number | Date | null>>
    }
  ).rows?.[0]
  const oldestPendingAt = row?.['oldest_pending_at'] ? new Date(row['oldest_pending_at']) : null

  return {
    pending: Number(row?.['pending'] ?? 0),
    leased: Number(row?.['leased'] ?? 0),
    retryPending: Number(row?.['retry_pending'] ?? 0),
    processed: Number(row?.['processed'] ?? 0),
    deadLetter: Number(row?.['dead_letter'] ?? 0),
    activeJobs: Number(row?.['active_jobs'] ?? 0),
    completedJobs: Number(row?.['completed_jobs'] ?? 0),
    completedWithErrorsJobs: Number(row?.['completed_with_errors_jobs'] ?? 0),
    oldestPendingAgeMs:
      oldestPendingAt === null ? null : Math.max(0, now.getTime() - oldestPendingAt.getTime()),
  }
}
