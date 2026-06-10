import { BaseQuery } from '#modules/notifications/actions/base_query'
import type {
  NotificationRetentionRepository,
  NotificationRetentionStatus,
} from '#modules/notifications/actions/ports/outbound/notification_retention_repository'
import {
  NOTIFICATION_PROCESSED_WORK_RETENTION_MS,
  NOTIFICATION_RETIRED_INDEX_GRACE_MS,
} from '#modules/notifications/domain/notification-outbox/notification_retention_policy'

export interface PreviewNotificationRetentionQueryInput {
  readonly now?: Date
}

export class PreviewNotificationRetentionQuery extends BaseQuery<
  PreviewNotificationRetentionQueryInput,
  NotificationRetentionStatus
> {
  constructor(
    private readonly repository: Pick<NotificationRetentionRepository, 'operationalStatus'>
  ) {
    super()
  }

  execute(input: PreviewNotificationRetentionQueryInput): Promise<NotificationRetentionStatus>
  execute(now?: Date): Promise<NotificationRetentionStatus>
  override execute(
    inputOrNow: PreviewNotificationRetentionQueryInput | Date = {}
  ): Promise<NotificationRetentionStatus> {
    const now = inputOrNow instanceof Date ? inputOrNow : inputOrNow.now ?? new Date()
    return this.repository.operationalStatus(
      now,
      new Date(now.getTime() - NOTIFICATION_PROCESSED_WORK_RETENTION_MS),
      new Date(now.getTime() - NOTIFICATION_RETIRED_INDEX_GRACE_MS)
    )
  }
}
