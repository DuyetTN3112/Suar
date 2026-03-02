import notificationConfig from '#config/notification'
import { PromoteNotificationProjectionCommand } from '#modules/notifications/actions/commands/promote_notification_projection_command'
import { PurgeNotificationRetentionCommand } from '#modules/notifications/actions/commands/purge_notification_retention_command'
import { RebuildNotificationProjectionCommand } from '#modules/notifications/actions/commands/rebuild_notification_projection_command'
import { ReconcileNotificationProjectionCommand } from '#modules/notifications/actions/commands/reconcile_notification_projection_command'
import { RollbackNotificationProjectionCommand } from '#modules/notifications/actions/commands/rollback_notification_projection_command'
import { PreviewNotificationRetentionQuery } from '#modules/notifications/actions/queries/preview_notification_retention_query'
import {
  DEFAULT_NOTIFICATION_READ_ALIAS,
  DEFAULT_NOTIFICATION_WRITE_ALIAS,
} from '#modules/notifications/infra/repositories/postgres_notification_projection_delivery_repository'
import { PostgresNotificationProjectionOperationsRepository } from '#modules/notifications/infra/repositories/postgres_notification_projection_operations_repository'
import { PostgresNotificationRetentionRepository } from '#modules/notifications/infra/repositories/postgres_notification_retention_repository'
import { NotificationProjectionAdminRepository } from '#modules/notifications/infra/search/notification_projection_admin_repository'
import { NotificationProjectionReconciliationExecutor } from '#modules/notifications/infra/search/notification_projection_reconciliation_executor'
import { NotificationSearchIndexRepository } from '#modules/notifications/infra/search/notification_search_index_repository'

const aliases = {
  readAlias: DEFAULT_NOTIFICATION_READ_ALIAS,
  writeAlias: DEFAULT_NOTIFICATION_WRITE_ALIAS,
}

function projectionDependencies() {
  const operations = new PostgresNotificationProjectionOperationsRepository()
  const admin = new NotificationProjectionAdminRepository()
  const writer = new NotificationSearchIndexRepository()
  const reconciler = new NotificationProjectionReconciliationExecutor({
    expected: operations,
    actual: admin,
    writer,
  })

  return { operations, admin, writer, reconciler }
}

export function makeRebuildNotificationProjectionCommand() {
  return new RebuildNotificationProjectionCommand(projectionDependencies())
}

export function makePromoteNotificationProjectionCommand() {
  const { operations, admin, reconciler } = projectionDependencies()
  return new PromoteNotificationProjectionCommand({
    operations,
    admin,
    reconciler,
    aliases,
    rollbackWindowMs: notificationConfig.projectionRollbackWindowMs,
  })
}

export function makeRollbackNotificationProjectionCommand() {
  const { operations, admin } = projectionDependencies()
  return new RollbackNotificationProjectionCommand({
    operations,
    admin,
    aliases,
  })
}

export function makeReconcileNotificationProjectionCommand() {
  const { operations, reconciler } = projectionDependencies()
  return new ReconcileNotificationProjectionCommand({
    operations,
    reconciler,
  })
}

export function makePurgeNotificationRetentionCommand() {
  return new PurgeNotificationRetentionCommand({
    repository: new PostgresNotificationRetentionRepository(),
    search: new NotificationSearchIndexRepository(),
    indexLifecycle: new NotificationProjectionAdminRepository(),
    aliases,
  })
}

export function makePreviewNotificationRetentionQuery() {
  return new PreviewNotificationRetentionQuery(new PostgresNotificationRetentionRepository())
}
