import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import type { NotificationRepository } from '#modules/notifications/actions/ports/outbound/notification_repository'
import { buildNotificationEvent } from '#modules/notifications/observability/notification_event_factory'
import {
  PLATFORM_EVENT_NAMES,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'

export class MarkAllNotificationsAsReadCommand {
  constructor(
    private readonly execCtx: NotificationActionContext,
    private readonly repository: NotificationRepository
  ) {}

  async execute() {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    try {
      await this.repository.markAllAsRead(userId)

      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildNotificationEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.NOTIFICATION_MARK_ALL_READ_COMPLETED,
          eventFamily: 'workflow',
          subsystem: 'notification_center',
          workflow: 'notification_read_management',
          stage: 'completed',
          outcome: 'success',
          targetType: 'notification_feed',
          targetId: userId,
          change: {
            action: 'mark_all_read',
            user_id: userId,
          },
        })
      )

      return { success: true }
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildNotificationEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.NOTIFICATION_MARK_ALL_READ_FAILED,
          eventFamily: 'workflow',
          subsystem: 'notification_center',
          workflow: 'notification_read_management',
          stage: 'failed',
          outcome: 'failure',
          targetType: 'notification_feed',
          targetId: userId,
          change: {
            action: 'mark_all_read',
            user_id: userId,
          },
          error,
        })
      )
      throw error
    }
  }
}
