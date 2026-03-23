import { Result, BaseCheck } from '@adonisjs/core/health'
import type { HealthCheckResult } from '@adonisjs/core/types/health'

import notificationConfig from '#config/notification'
import {
  readNotificationOperationsSnapshot,
  type NotificationOperationsSnapshot,
} from '#modules/notifications/public_contracts/notification_operations'

interface NotificationPipelineReader {
  snapshot(now: Date): Promise<NotificationOperationsSnapshot>
}

interface NotificationPipelineHealthThresholds {
  warningAgeMs: number
  failureAgeMs: number
  warningPending: number
  failurePending: number
}

const defaultReader: NotificationPipelineReader = {
  snapshot(now) {
    return readNotificationOperationsSnapshot(
      now,
      notificationConfig.pipelineFailPending
    )
  },
}

const defaultThresholds: NotificationPipelineHealthThresholds = {
  warningAgeMs: notificationConfig.pipelineWarnAgeSeconds * 1_000,
  failureAgeMs: notificationConfig.pipelineFailAgeSeconds * 1_000,
  warningPending: notificationConfig.pipelineWarnPending,
  failurePending: notificationConfig.pipelineFailPending,
}

function seconds(value: number | null): number {
  return value === null ? 0 : Math.max(0, Math.floor(value / 1_000))
}

export class NotificationPipelineHealthCheck extends BaseCheck {
  public readonly name = 'notification_pipeline'

  constructor(
    private readonly reader: NotificationPipelineReader = defaultReader,
    private readonly thresholds: NotificationPipelineHealthThresholds = defaultThresholds,
    private readonly now: () => Date = () => new Date()
  ) {
    super()
    if (
      thresholds.warningAgeMs < 1_000 ||
      thresholds.failureAgeMs <= thresholds.warningAgeMs ||
      thresholds.warningPending < 1 ||
      thresholds.failurePending <= thresholds.warningPending
    ) {
      throw new RangeError(
        'Notification pipeline health thresholds require positive warning values below failure values'
      )
    }
  }

  async run(): Promise<HealthCheckResult> {
    try {
      const snapshot = await this.reader.snapshot(this.now())
      const outboxAgeSeconds = seconds(snapshot.outbox.oldestPendingAgeMs)
      const fanoutAgeSeconds = seconds(snapshot.fanout.oldestPendingAgeMs)
      const operatorActionRequired =
        snapshot.outbox.deadLetter > 0 ||
        snapshot.fanout.deadLetter > 0 ||
        snapshot.fanout.completedWithErrorsJobs > 0 ||
        snapshot.retention.tombstonesAwaitingProjectionProof > 0 ||
        snapshot.retention.expiredRollbackTargets > 0 ||
        snapshot.retention.retiredIndicesAwaitingDeletion > 0
      const metadata = {
        outbox_pending: snapshot.outbox.pending,
        outbox_leased: snapshot.outbox.leased,
        outbox_retry_pending: snapshot.outbox.retryPending,
        outbox_dead_letter: snapshot.outbox.deadLetter,
        outbox_oldest_pending_age_seconds: outboxAgeSeconds,
        fanout_pending: snapshot.fanout.pending,
        fanout_leased: snapshot.fanout.leased,
        fanout_retry_pending: snapshot.fanout.retryPending,
        fanout_dead_letter: snapshot.fanout.deadLetter,
        fanout_active_jobs: snapshot.fanout.activeJobs,
        fanout_completed_with_errors_jobs: snapshot.fanout.completedWithErrorsJobs,
        fanout_oldest_pending_age_seconds: fanoutAgeSeconds,
        retention_due_notifications: snapshot.retention.dueNotifications,
        retention_eligible_processed_outbox:
          snapshot.retention.eligibleProcessedOutbox,
        retention_eligible_completed_fanout_jobs:
          snapshot.retention.eligibleCompletedFanoutJobs,
        retention_tombstones_awaiting_projection_proof:
          snapshot.retention.tombstonesAwaitingProjectionProof,
        retention_expired_rollback_targets:
          snapshot.retention.expiredRollbackTargets,
        retention_retired_indices_awaiting_deletion:
          snapshot.retention.retiredIndicesAwaitingDeletion,
        warning_age_seconds: Math.floor(this.thresholds.warningAgeMs / 1_000),
        failure_age_seconds: Math.floor(this.thresholds.failureAgeMs / 1_000),
        warning_pending: this.thresholds.warningPending,
        failure_pending: this.thresholds.failurePending,
        operator_action_required: operatorActionRequired,
      }

      if (
        snapshot.outbox.pending >= this.thresholds.failurePending ||
        snapshot.fanout.pending >= this.thresholds.failurePending ||
        (snapshot.outbox.oldestPendingAgeMs ?? 0) >= this.thresholds.failureAgeMs ||
        (snapshot.fanout.oldestPendingAgeMs ?? 0) >= this.thresholds.failureAgeMs
      ) {
        return Result.failed('Notification pipeline exceeded its processing objective')
          .mergeMetaData(metadata)
          .toJSON()
      }

      if (
        operatorActionRequired ||
        snapshot.outbox.pending >= this.thresholds.warningPending ||
        snapshot.fanout.pending >= this.thresholds.warningPending ||
        (snapshot.outbox.oldestPendingAgeMs ?? 0) >= this.thresholds.warningAgeMs ||
        (snapshot.fanout.oldestPendingAgeMs ?? 0) >= this.thresholds.warningAgeMs
      ) {
        return Result.warning('Notification pipeline requires operator attention')
          .mergeMetaData(metadata)
          .toJSON()
      }

      return Result.ok('Notification pipeline is current').mergeMetaData(metadata).toJSON()
    } catch (error) {
      return Result.failed('Unable to inspect notification pipeline')
        .mergeMetaData({
          error_class: error instanceof Error ? error.constructor.name : 'UnknownError',
        })
        .toJSON()
    }
  }
}
