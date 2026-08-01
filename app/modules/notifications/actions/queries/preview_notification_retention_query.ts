import type {
  NotificationRetentionRepository,
  NotificationRetentionStatus,
} from '#modules/notifications/actions/ports/outbound/notification_retention_repository'
import {
  NOTIFICATION_PROCESSED_WORK_RETENTION_MS,
  NOTIFICATION_RETIRED_INDEX_GRACE_MS,
} from '#modules/notifications/domain/notification_retention_policy'

export class PreviewNotificationRetentionQuery {
  constructor(
    private readonly repository: Pick<NotificationRetentionRepository, 'operationalStatus'>
  ) {}

  execute(now: Date = new Date()): Promise<NotificationRetentionStatus> {
    return this.repository.operationalStatus(
      now,
      new Date(now.getTime() - NOTIFICATION_PROCESSED_WORK_RETENTION_MS),
      new Date(now.getTime() - NOTIFICATION_RETIRED_INDEX_GRACE_MS)
    )
  }
}
