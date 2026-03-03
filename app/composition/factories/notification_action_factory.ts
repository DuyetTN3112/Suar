import { DeleteAllReadNotificationsCommand } from '#modules/notifications/actions/commands/delete_all_read_notifications_command'
import { DeleteNotificationCommand } from '#modules/notifications/actions/commands/delete_notification_command'
import { MarkAllNotificationsAsReadCommand } from '#modules/notifications/actions/commands/mark_all_notifications_as_read_command'
import { MarkNotificationAsReadCommand } from '#modules/notifications/actions/commands/mark_notification_as_read_command'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import { NotificationActionFactory } from '#modules/notifications/actions/ports/inbound/notification_action_factory'
import type { NotificationRepository } from '#modules/notifications/actions/ports/outbound/notification_repository'
import {
  GetUserNotificationsQuery,
  type GetUserNotificationsDependencies,
} from '#modules/notifications/actions/queries/get_user_notifications_query'

export class ComposedNotificationActionFactory extends NotificationActionFactory {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly feedDependencies: GetUserNotificationsDependencies
  ) {
    super()
  }

  makeDeleteNotification(context: NotificationActionContext): DeleteNotificationCommand {
    return new DeleteNotificationCommand(context, this.repository)
  }

  makeDeleteAllReadNotifications(
    context: NotificationActionContext
  ): DeleteAllReadNotificationsCommand {
    return new DeleteAllReadNotificationsCommand(context, this.repository)
  }

  makeMarkNotificationAsRead(context: NotificationActionContext): MarkNotificationAsReadCommand {
    return new MarkNotificationAsReadCommand(context, this.repository)
  }

  makeMarkAllNotificationsAsRead(
    context: NotificationActionContext
  ): MarkAllNotificationsAsReadCommand {
    return new MarkAllNotificationsAsReadCommand(context, this.repository)
  }

  makeGetUserNotifications(context: NotificationActionContext): GetUserNotificationsQuery {
    return new GetUserNotificationsQuery(context, this.feedDependencies)
  }
}
