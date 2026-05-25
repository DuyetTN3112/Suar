import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/notifications/actions/base_command'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import type { NotificationRepository } from '#modules/notifications/actions/ports/outbound/notification_repository'
import { buildNotificationEvent } from '#modules/notifications/observability/notification_event_factory'
import {
  PLATFORM_EVENT_NAMES,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'

export class DeleteAllReadNotificationsCommand extends BaseCommand<
  Record<string, never>,
  { success: boolean }
> {
  constructor(
    private readonly execCtx: NotificationActionContext,
    private readonly repository: NotificationRepository
  ) {
    super()
  }

  override async executeAndWrap(
    input: Record<string, never> = {}
  ): Promise<Result<{ success: boolean }, AppException>> {
    return super.executeAndWrap(input)
  }

  override async execute(_input: Record<string, never> = {}): Promise<{ success: boolean }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    try {
      await this.repository.deleteAllRead(userId)

      await platformWorkflowLogger.checkpointSafely(
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
      await platformWorkflowLogger.checkpointSafely(
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
