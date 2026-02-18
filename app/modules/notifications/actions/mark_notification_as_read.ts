import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import { notificationRepositoryProvider } from '#modules/notifications/infra/repositories/notification_repository_provider'
import { buildNotificationEvent } from '#modules/notifications/observability/notification_event_factory'
import { PLATFORM_EVENT_NAMES, platformWorkflowLogger } from '#modules/observability/public_contracts/platform_observability'

export default class MarkNotificationAsRead {
  constructor(protected execCtx: NotificationActionContext) {}

  async handle({ id }: { id: string }) {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    try {
      const repo = notificationRepositoryProvider.getNotificationRepository()
      const updated = await repo.markAsRead(id, userId)

      if (!updated) {
        throw NotFoundException.resource('Notification', id)
      }

      await platformWorkflowLogger.checkpoint(
        this.execCtx,
        buildNotificationEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.NOTIFICATION_MARK_READ_COMPLETED,
          eventFamily: 'workflow',
          subsystem: 'notification_center',
          workflow: 'notification_read_management',
          stage: 'completed',
          outcome: 'success',
          targetType: 'notification',
          targetId: id,
          change: {
            action: 'mark_read',
            user_id: userId,
          },
        })
      )

      return { success: true }
    } catch (error) {
      await platformWorkflowLogger.checkpoint(
        this.execCtx,
        buildNotificationEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.NOTIFICATION_MARK_READ_FAILED,
          eventFamily: 'workflow',
          subsystem: 'notification_center',
          workflow: 'notification_read_management',
          stage: 'failed',
          outcome: 'failure',
          targetType: 'notification',
          targetId: id,
          change: {
            action: 'mark_read',
            user_id: userId,
          },
          error,
        })
      )
      throw error
    }
  }
  // Đánh dấu tất cả thông báo của người dùng là đã đọc → delegate to Model
  async markAllAsRead() {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    try {
      const repo = notificationRepositoryProvider.getNotificationRepository()
      await repo.markAllAsRead(userId)

      await platformWorkflowLogger.checkpoint(
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
      await platformWorkflowLogger.checkpoint(
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
