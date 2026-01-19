import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import type { NotificationRepository } from '#modules/notifications/actions/ports/outbound/notification_repository'
import { buildNotificationEvent } from '#modules/notifications/observability/notification_event_factory'
import {
  PLATFORM_EVENT_NAMES,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'

export class DeleteNotificationCommand {
  constructor(
    protected execCtx: NotificationActionContext,
    private readonly repository: NotificationRepository
  ) {}

  async execute({ id }: { id: string }) {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    try {
      const deleted = await this.repository.delete(id, userId)

      if (!deleted) {
        throw NotFoundException.resource('Notification', id)
      }

      await platformWorkflowLogger.checkpointSafely(
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
      await platformWorkflowLogger.checkpointSafely(
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
}
