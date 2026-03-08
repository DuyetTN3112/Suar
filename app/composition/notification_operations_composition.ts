import { randomUUID } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { LucidNotificationTransactionRunner } from './adapters/lucid_notification_transaction_runner.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { DiscardNotificationOutboxDeadLettersCommand } from '#modules/notifications/actions/commands/discard_notification_outbox_dead_letters_command'
import { ReplayNotificationFanoutCommand } from '#modules/notifications/actions/commands/replay_notification_fanout_command'
import { ReplayNotificationOutboxCommand } from '#modules/notifications/actions/commands/replay_notification_outbox_command'
import { StageNotificationFanoutCommand } from '#modules/notifications/actions/commands/stage_notification_fanout_command'
import type {
  NotificationFanoutReplayRepository,
  NotificationOutboxOperationsRepository,
} from '#modules/notifications/actions/ports/outbound/notification_operations_repository'
import { PreviewNotificationOutboxDeadLettersQuery } from '#modules/notifications/actions/queries/preview_notification_outbox_dead_letters_query'
import { PostgresNotificationFanoutRepository } from '#modules/notifications/infra/repositories/postgres_notification_fanout_repository'
import { PostgresNotificationFanoutStagingRepository } from '#modules/notifications/infra/repositories/postgres_notification_fanout_staging_repository'
import { PostgresNotificationOutboxRepository } from '#modules/notifications/infra/repositories/postgres_notification_outbox_repository'
import { NodeNotificationCryptography } from '#modules/notifications/infra/security/node_notification_cryptography'

const notificationCryptography = new NodeNotificationCryptography()

function fanoutReplayRepository(): NotificationFanoutReplayRepository {
  const repository = new PostgresNotificationFanoutRepository()
  return {
    replayDeadLetters: (selector, now, transaction) =>
      repository.replayDeadLetters(selector, now, transaction as TransactionClientContract),
  }
}

function outboxOperationsRepository(): NotificationOutboxOperationsRepository {
  const repository = new PostgresNotificationOutboxRepository()
  return {
    replayDeadLetters: (selector, now, transaction) =>
      repository.replayDeadLetters(selector, now, transaction as TransactionClientContract),
    previewDeadLetters: (input) => repository.previewDeadLetters(input),
    discardDeadLetters: (input, transaction) =>
      repository.discardDeadLetters(input, transaction as TransactionClientContract),
  }
}

export function makeReplayNotificationFanoutCommand() {
  return new ReplayNotificationFanoutCommand(
    fanoutReplayRepository(),
    new LucidNotificationTransactionRunner(),
    auditPublicApi
  )
}

export function makeNotificationFanoutStager(options: { maxTargets?: number } = {}) {
  const command = new StageNotificationFanoutCommand(
    new PostgresNotificationFanoutStagingRepository(),
    notificationCryptography,
    options
  )
  return {
    stage: command.execute.bind(command),
  }
}

export function makeReplayNotificationOutboxCommand() {
  return new ReplayNotificationOutboxCommand(
    outboxOperationsRepository(),
    new LucidNotificationTransactionRunner(),
    auditPublicApi,
    { next: randomUUID }
  )
}

export function makePreviewNotificationOutboxDeadLettersQuery() {
  return new PreviewNotificationOutboxDeadLettersQuery(outboxOperationsRepository(), auditPublicApi)
}

export function makeDiscardNotificationOutboxDeadLettersCommand() {
  return new DiscardNotificationOutboxDeadLettersCommand(
    outboxOperationsRepository(),
    new LucidNotificationTransactionRunner(),
    auditPublicApi
  )
}
