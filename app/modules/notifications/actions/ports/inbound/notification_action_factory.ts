import type { DeleteAllReadNotificationsCommand } from '#modules/notifications/actions/commands/delete_all_read_notifications_command'
import type { DeleteNotificationCommand } from '#modules/notifications/actions/commands/delete_notification_command'
import type { MarkAllNotificationsAsReadCommand } from '#modules/notifications/actions/commands/mark_all_notifications_as_read_command'
import type { MarkNotificationAsReadCommand } from '#modules/notifications/actions/commands/mark_notification_as_read_command'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import type { GetUserNotificationsQuery } from '#modules/notifications/actions/queries/get_user_notifications_query'

/**
 * Runtime DI token for context-bound notification use cases.
 *
 * The implementation belongs to the composition root. Controllers depend on
 * this inbound construction contract and execute exactly one Command or Query
 * for each endpoint intent.
 */
export abstract class NotificationActionFactory {
  abstract makeDeleteNotification(context: NotificationActionContext): DeleteNotificationCommand

  abstract makeDeleteAllReadNotifications(
    context: NotificationActionContext
  ): DeleteAllReadNotificationsCommand

  abstract makeMarkNotificationAsRead(
    context: NotificationActionContext
  ): MarkNotificationAsReadCommand

  abstract makeMarkAllNotificationsAsRead(
    context: NotificationActionContext
  ): MarkAllNotificationsAsReadCommand

  abstract makeGetUserNotifications(context: NotificationActionContext): GetUserNotificationsQuery
}
