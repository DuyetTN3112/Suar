import { LucidNotificationTransactionRunner } from '#composition/adapters/notifications/lucid_notification_transaction_runner'
import { NotificationTransactionStagerAdapter } from '#composition/adapters/notifications/notification_transaction_stager_adapter'

import { notificationActionFactory } from '#composition/notifications/notification-feed/notification_feed_composition'
import { AcceptLegacyNotificationCommand } from '#modules/notifications/actions/commands/legacy/accept_legacy_notification_command'
import { AcceptNotificationCommand } from '#modules/notifications/actions/commands/notification-feed/accept_notification_command'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import { PostgresNotificationAcceptanceRepository } from '#modules/notifications/infra/repositories/notification-outbox/postgres_notification_acceptance_repository'
import { NodeNotificationCryptography } from '#modules/notifications/infra/adapters/notification-outbox/node_notification_cryptography'

const notificationCryptography = new NodeNotificationCryptography()
const notificationTransactionRunner = new LucidNotificationTransactionRunner()
const acceptNotificationCommand = new AcceptNotificationCommand(
  new PostgresNotificationAcceptanceRepository(),
  notificationCryptography,
  notificationTransactionRunner
)
const acceptLegacyNotificationCommand = new AcceptLegacyNotificationCommand(
  acceptNotificationCommand,
  notificationCryptography,
  notificationCryptography,
  notificationTransactionRunner
)

const createLegacyNotification = async (
  data: Parameters<AcceptLegacyNotificationCommand['execute']>[0]
) => {
  const result = await acceptLegacyNotificationCommand.execute(data)
  return result.notification
}

export const notificationTransactionStager = new NotificationTransactionStagerAdapter(
  acceptNotificationCommand
)

export const notificationApplication = {
  handle: createLegacyNotification,
  create: createLegacyNotification,
  accept: (
    command: Parameters<AcceptNotificationCommand['execute']>[0],
    options?: Parameters<AcceptNotificationCommand['execute']>[1]
  ) => acceptNotificationCommand.execute(command, options),
  stage: acceptNotificationCommand.stage.bind(acceptNotificationCommand),
}

export function makeMarkNotificationAsRead(execCtx: NotificationActionContext) {
  const one = notificationActionFactory.makeMarkNotificationAsRead(execCtx)
  const all = notificationActionFactory.makeMarkAllNotificationsAsRead(execCtx)
  return {
    handle: one.execute.bind(one),
    markAllAsRead: all.execute.bind(all),
  }
}

export function makeDeleteNotification(execCtx: NotificationActionContext) {
  const one = notificationActionFactory.makeDeleteNotification(execCtx)
  const all = notificationActionFactory.makeDeleteAllReadNotifications(execCtx)
  return {
    handle: one.execute.bind(one),
    deleteAllRead: all.execute.bind(all),
  }
}
