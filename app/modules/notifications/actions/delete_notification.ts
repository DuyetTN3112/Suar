import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import { notificationRepositoryProvider } from '#modules/notifications/infra/repositories/notification_repository_provider'
import { buildNotificationEvent } from '#modules/notifications/observability/notification_event_factory'
import { PLATFORM_EVENT_NAMES, platformWorkflowLogger } from '#modules/observability/public_contracts/platform_observability'

export default class DeleteNotification {
  constructor(protected execCtx: NotificationActionContext) {}

  async handle({ id }: { id: string }) {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    try {
      const repo = notificationRepositoryProvider.getNotificationRepository()
      const deleted = await repo.delete(id, userId)

      if (!deleted) {
        throw NotFoundException.resource('Notification', id)
      }

      await platformWorkflowLogger.checkpoint(
        this.execCtx,
        buildNotificationEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.NOTIFICATION_DELETE_COMPLETED,
          eventFamily: 'workflow',
          subsystem: 'notification_center',
          workflow: 'notification_cleanup',
          stage: 'completed',
          outcome: 'success',
          targetType: 'notification',
          targetId: id,
          change: {
            action: 'delete',
            user_id: userId,
          },
        })
      )

      return { success: true }
    } catch (error) {
      await platformWorkflowLogger.checkpoint(
        this.execCtx,
        buildNotificationEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.NOTIFICATION_DELETE_FAILED,
          eventFamily: 'workflow',
          subsystem: 'notification_center',
          workflow: 'notification_cleanup',
          stage: 'failed',
          outcome: 'failure',
          targetType: 'notification',
          targetId: id,
          change: {
            action: 'delete',
            user_id: userId,
          },
          error,
        })
      )
      throw error
    }
  }
  // Xóa tất cả thông báo đã đọc → delegate to Model
  async deleteAllRead() {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    try {
      const repo = notificationRepositoryProvider.getNotificationRepository()
      await repo.deleteAllRead(userId)

      await platformWorkflowLogger.checkpoint(
        this.execCtx,
        buildNotificationEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.NOTIFICATION_DELETE_ALL_READ_COMPLETED,
          eventFamily: 'workflow',
          subsystem: 'notification_center',
          workflow: 'notification_cleanup',
          stage: 'completed',
          outcome: 'success',
          targetType: 'notification_feed',
          targetId: userId,
          change: {
            action: 'delete_all_read',
            user_id: userId,
          },
        })
      )

      return { success: true }
    } catch (error) {
      await platformWorkflowLogger.checkpoint(
        this.execCtx,
        buildNotificationEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.NOTIFICATION_DELETE_ALL_READ_FAILED,
          eventFamily: 'workflow',
          subsystem: 'notification_center',
          workflow: 'notification_cleanup',
          stage: 'failed',
          outcome: 'failure',
          targetType: 'notification_feed',
          targetId: userId,
          change: {
            action: 'delete_all_read',
            user_id: userId,
          },
          error,
        })
      )
      throw error
    }
  }
}
