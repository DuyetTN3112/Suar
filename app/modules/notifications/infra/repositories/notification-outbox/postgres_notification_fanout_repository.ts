import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  advanceJob,
  rowsFrom,
  throwIfFanoutOperationAborted,
  toTarget,
  validateClaimInput,
} from './postgres_notification_fanout_mapper.js'
import {
  queryOperationalStatus,
  replayDeadLetters,
} from './postgres_notification_fanout_queries.js'

import type { NotificationTransaction } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type { NotificationFanoutRepository } from '#modules/notifications/actions/ports/outbound/notification_fanout_repository'
import type {
  NotificationFanoutClaimInput,
  NotificationFanoutFailureInput,
  NotificationFanoutLeaseInput,
  NotificationFanoutReplayRow,
  NotificationFanoutReplaySelector,
  NotificationFanoutRetryInput,
  NotificationFanoutWorkTarget,
} from '#modules/notifications/domain/notification-outbox/notification_fanout'

export class PostgresNotificationFanoutRepository implements NotificationFanoutRepository {
  async claimBatch(input: NotificationFanoutClaimInput): Promise<NotificationFanoutWorkTarget[]> {
    validateClaimInput(input)
    throwIfFanoutOperationAborted(input.signal)
    const lockedUntil = new Date(input.now.getTime() + input.leaseDurationMs)

    return db.transaction(async (trx) => {
      throwIfFanoutOperationAborted(input.signal)
      const result: unknown = await trx.rawQuery(
        `
          WITH candidates AS (
            SELECT target.id
            FROM notification_fanout_targets AS target
            WHERE (
              (target.status = 'pending' AND target.available_at <= ?)
              OR (target.status = 'leased' AND target.locked_until <= ?)
            )
            ORDER BY target.sequence ASC
            FOR UPDATE SKIP LOCKED
            LIMIT ?
          ),
          claimed AS (
            UPDATE notification_fanout_targets AS target
            SET
              status = 'leased',
              attempt_count = target.attempt_count + 1,
              locked_by = ?,
              locked_until = ?,
              lease_token = gen_random_uuid(),
              updated_at = ?
            FROM candidates
            WHERE target.id = candidates.id
            RETURNING target.*
          ),
          touched_jobs AS (
            UPDATE notification_fanout_jobs AS job
            SET status = 'processing', updated_at = ?
            WHERE job.id IN (SELECT DISTINCT job_id FROM claimed)
              AND job.status IN ('pending', 'processing')
            RETURNING job.id
          )
          SELECT
            claimed.*,
            job.notification_type,
            job.schema_version,
            job.scope_type,
            job.scope_id,
            job.actor_type,
            job.actor_id,
            job.subject_type,
            job.subject_id,
            job.parameters,
            job.occurred_at,
            job.correlation_id,
            job.dedupe_key
          FROM claimed
          JOIN notification_fanout_jobs AS job ON job.id = claimed.job_id
          ORDER BY claimed.sequence ASC
        `,
        [input.now, input.now, input.batchSize, input.workerId, lockedUntil, input.now, input.now]
      )

      throwIfFanoutOperationAborted(input.signal)
      return rowsFrom(result).map(toTarget)
    })
  }

  async lockForProcessing(
    input: NotificationFanoutLeaseInput,
    transaction: NotificationTransaction
  ): Promise<NotificationFanoutWorkTarget | null> {
    const trx = transaction as TransactionClientContract
    const result: unknown = await trx.rawQuery(
      `
        SELECT
          target.*,
          job.notification_type,
          job.schema_version,
          job.scope_type,
          job.scope_id,
          job.actor_type,
          job.actor_id,
          job.subject_type,
          job.subject_id,
          job.parameters,
          job.occurred_at,
          job.correlation_id,
          job.dedupe_key
        FROM notification_fanout_targets AS target
        JOIN notification_fanout_jobs AS job ON job.id = target.job_id
        WHERE target.id = ?
          AND target.lease_token = ?
          AND target.status = 'leased'
          AND target.locked_until > ?
        FOR UPDATE OF target
      `,
      [input.targetId, input.leaseToken, input.now]
    )
    const row = rowsFrom(result)[0]
    return row ? toTarget(row) : null
  }

  async markProcessed(
    input: NotificationFanoutLeaseInput & { notificationId: string },
    transaction: NotificationTransaction
  ): Promise<boolean> {
    const trx = transaction as TransactionClientContract
    const result: unknown = await trx.rawQuery(
      `
        UPDATE notification_fanout_targets
        SET
          status = 'processed',
          notification_id = ?,
          processed_at = ?,
          locked_by = NULL,
          locked_until = NULL,
          lease_token = NULL,
          last_error_class = NULL,
          last_error_message = NULL,
          updated_at = ?
        WHERE id = ?
          AND lease_token = ?
          AND status = 'leased'
          AND locked_until > ?
        RETURNING job_id
      `,
      [input.notificationId, input.now, input.now, input.targetId, input.leaseToken, input.now]
    )
    const jobId = (result as { rows?: Array<{ job_id: string }> }).rows?.[0]?.job_id
    if (!jobId) {
      return false
    }
    await advanceJob(trx, jobId, 'processed', input.now)
    return true
  }

  async retry(input: NotificationFanoutRetryInput): Promise<boolean> {
    return db.transaction(async (trx) => {
      throwIfFanoutOperationAborted(input.signal)
      const result: unknown = await trx.rawQuery(
        `
          UPDATE notification_fanout_targets
          SET
            status = 'pending',
            available_at = ?,
            locked_by = NULL,
            locked_until = NULL,
            lease_token = NULL,
            last_error_class = ?,
            last_error_message = ?,
            updated_at = ?
          WHERE id = ?
            AND lease_token = ?
            AND status = 'leased'
            AND locked_until > ?
          RETURNING job_id
        `,
        [
          input.availableAt,
          input.errorClass,
          input.errorMessage,
          input.now,
          input.targetId,
          input.leaseToken,
          input.now,
        ]
      )
      throwIfFanoutOperationAborted(input.signal)
      const jobId = (result as { rows?: Array<{ job_id: string }> }).rows?.[0]?.job_id
      if (!jobId) {
        return false
      }
      await trx
        .from('notification_fanout_jobs')
        .where('id', jobId)
        .whereIn('status', ['pending', 'processing'])
        .update({ status: 'processing', updated_at: input.now })
      throwIfFanoutOperationAborted(input.signal)
      return true
    })
  }

  async deadLetter(input: NotificationFanoutFailureInput): Promise<boolean> {
    return db.transaction(async (trx) => {
      throwIfFanoutOperationAborted(input.signal)
      const result: unknown = await trx.rawQuery(
        `
          UPDATE notification_fanout_targets
          SET
            status = 'dead_letter',
            dead_lettered_at = ?,
            locked_by = NULL,
            locked_until = NULL,
            lease_token = NULL,
            last_error_class = ?,
            last_error_message = ?,
            updated_at = ?
          WHERE id = ?
            AND lease_token = ?
            AND status = 'leased'
            AND locked_until > ?
          RETURNING job_id
        `,
        [
          input.now,
          input.errorClass,
          input.errorMessage,
          input.now,
          input.targetId,
          input.leaseToken,
          input.now,
        ]
      )
      throwIfFanoutOperationAborted(input.signal)
      const jobId = (result as { rows?: Array<{ job_id: string }> }).rows?.[0]?.job_id
      if (!jobId) {
        return false
      }
      await advanceJob(trx, jobId, 'dead_letter', input.now)
      throwIfFanoutOperationAborted(input.signal)
      return true
    })
  }

  async replayDeadLetters(
    selector: NotificationFanoutReplaySelector,
    now: Date,
    trx: TransactionClientContract
  ): Promise<NotificationFanoutReplayRow[]> {
    return replayDeadLetters(selector, now, trx)
  }

  async operationalStatus(
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
    return queryOperationalStatus(now, countLimit)
  }
}
