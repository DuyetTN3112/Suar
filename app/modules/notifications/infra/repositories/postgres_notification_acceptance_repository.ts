import { randomUUID } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  CanonicalNotificationRecord,
  NotificationAcceptancePersistenceResult,
  NotificationAcceptanceRepository,
  NotificationAcceptanceWrite,
  NotificationTransaction,
} from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type { NotificationCommandV1 } from '#modules/notifications/domain/notification_command'
import {
  NotificationCanonicalStateError,
  NotificationDedupeConflictError,
  NotificationEventConflictError,
} from '#modules/notifications/domain/notification_contract_errors'
import { acquireNotificationProjectionWriterFence } from '#modules/notifications/infra/repositories/notification_projection_fence'

interface AcceptanceLedgerRow {
  event_id: string
  recipient_id: string
  event_fingerprint: string
  notification_id: string
  terminal_state: 'active' | 'deleted' | 'purged'
}

interface RecipientStateRow {
  recipient_id: string
  unread_count: number | string
  revision: number | string
}

function toCanonicalRecord(row: Record<string, unknown>): CanonicalNotificationRecord {
  return {
    ...(row as unknown as CanonicalNotificationRecord),
    schema_version: Number(row['schema_version']),
    template_version: Number(row['template_version']),
    revision: Number(row['revision']),
    retention_until: new Date(row['retention_until'] as string | Date),
    occurred_at: new Date(row['occurred_at'] as string | Date),
    created_at: new Date(row['created_at'] as string | Date),
    updated_at: row['updated_at'] ? new Date(row['updated_at'] as string | Date) : null,
    read_at: row['read_at'] ? new Date(row['read_at'] as string | Date) : null,
  }
}

async function loadExistingResult(
  transaction: TransactionClientContract,
  ledger: AcceptanceLedgerRow,
  fingerprint: string
): Promise<NotificationAcceptancePersistenceResult> {
  if (ledger.event_fingerprint !== fingerprint) {
    throw new NotificationEventConflictError()
  }

  if (ledger.terminal_state !== 'active') {
    return {
      terminalState: ledger.terminal_state,
      notificationId: ledger.notification_id,
      notification: null,
      duplicate: true,
    }
  }

  const row = (await transaction
    .from('notifications')
    .where('id', ledger.notification_id)
    .where('user_id', ledger.recipient_id)
    .first()) as Record<string, unknown> | undefined

  if (!row) {
    throw new NotificationCanonicalStateError(
      `Active notification ledger ${ledger.event_id} has no canonical row`
    )
  }

  return {
    terminalState: 'active',
    notificationId: ledger.notification_id,
    notification: toCanonicalRecord(row),
    duplicate: true,
  }
}

async function lockRecipientState(
  transaction: TransactionClientContract,
  recipientId: string
): Promise<RecipientStateRow> {
  await transaction
    .table('notification_recipient_states')
    .insert({
      recipient_id: recipientId,
      unread_count: 0,
      revision: 0,
    })
    .onConflict('recipient_id')
    .ignore()

  const state = (await transaction
    .from('notification_recipient_states')
    .where('recipient_id', recipientId)
    .forUpdate()
    .first()) as RecipientStateRow | undefined

  if (!state) {
    throw new NotificationCanonicalStateError(
      `Unable to lock notification recipient state for ${recipientId}`
    )
  }
  return state
}

async function findLedger(
  transaction: TransactionClientContract,
  command: NotificationCommandV1
): Promise<AcceptanceLedgerRow | undefined> {
  return (await transaction
    .from('notification_acceptance_ledger')
    .where('event_id', command.eventId)
    .where('recipient_id', command.recipientId)
    .first()) as AcceptanceLedgerRow | undefined
}

async function assertDedupeAvailable(
  transaction: TransactionClientContract,
  command: NotificationCommandV1
): Promise<void> {
  if (!command.dedupeKey) {
    return
  }

  const conflict = (await transaction
    .from('notification_acceptance_ledger')
    .select('event_id')
    .where('recipient_id', command.recipientId)
    .where('type', command.type)
    .where('dedupe_key', command.dedupeKey)
    .whereNot('event_id', command.eventId)
    .first()) as { event_id: string } | undefined

  if (conflict) {
    throw new NotificationDedupeConflictError()
  }
}

export class PostgresNotificationAcceptanceRepository implements NotificationAcceptanceRepository {
  async stage(
    input: NotificationAcceptanceWrite,
    transaction: NotificationTransaction
  ): Promise<NotificationAcceptancePersistenceResult> {
    const trx = transaction as TransactionClientContract
    const { command, fingerprint } = input
    await acquireNotificationProjectionWriterFence(trx)

    const recipientState = await lockRecipientState(trx, command.recipientId)
    const existingLedger = await findLedger(trx, command)
    if (existingLedger) {
      return loadExistingResult(trx, existingLedger, fingerprint)
    }

    await assertDedupeAvailable(trx, command)

    const notificationId = randomUUID()
    const operationId = randomUUID()

    await trx.table('notification_acceptance_ledger').insert({
      event_id: command.eventId,
      recipient_id: command.recipientId,
      event_fingerprint: fingerprint,
      notification_id: notificationId,
      type: command.type,
      dedupe_key: command.dedupeKey ?? null,
      occurred_at: command.occurredAt,
      terminal_state: 'active',
      accepted_at: input.acceptedAt,
    })

    const [notificationRow] = (await trx
      .table('notifications')
      .insert({
        id: notificationId,
        event_id: command.eventId,
        event_fingerprint: fingerprint,
        user_id: command.recipientId,
        title: input.snapshot.title,
        message: input.snapshot.message,
        is_read: false,
        type: command.type,
        related_entity_type: command.subject?.type ?? null,
        related_entity_id: command.subject?.id ?? null,
        metadata: null,
        occurred_at: command.occurredAt,
        correlation_id: command.correlationId ?? null,
        actor_type: command.actor?.type ?? null,
        actor_id: command.actor?.id ?? null,
        subject_type: command.subject?.type ?? null,
        subject_id: command.subject?.id ?? null,
        schema_version: command.schemaVersion,
        scope_type: command.scope.kind,
        scope_id: command.scope.kind === 'system' ? null : command.scope.id,
        organization_id: command.scope.kind === 'organization' ? command.scope.id : null,
        category: input.category,
        priority: input.priority,
        template_key: input.templateKey,
        template_version: input.templateVersion,
        locale: 'vi',
        parameters: command.parameters,
        action: input.snapshot.action,
        revision: 1,
        dedupe_key: command.dedupeKey ?? null,
        retention_class: input.retentionClass,
        retention_until: input.retentionUntil,
        created_at: input.acceptedAt,
        updated_at: input.acceptedAt,
        read_at: null,
      })
      .returning('*')) as Record<string, unknown>[]

    if (!notificationRow) {
      throw new NotificationCanonicalStateError('Canonical notification insert returned no row')
    }

    const [updatedState] = (await trx
      .from('notification_recipient_states')
      .where('recipient_id', command.recipientId)
      .where('revision', Number(recipientState.revision))
      .update({
        unread_count: Number(recipientState.unread_count) + 1,
        revision: Number(recipientState.revision) + 1,
        updated_at: input.acceptedAt,
      })
      .returning(['unread_count', 'revision'])) as {
      unread_count: number | string
      revision: number | string
    }[]

    if (!updatedState) {
      throw new NotificationCanonicalStateError(
        `Notification recipient state changed without its lock for ${command.recipientId}`
      )
    }
    const recipientStateRevision = Number(updatedState.revision)
    const unreadCount = Number(updatedState.unread_count)

    await trx.table('notification_outbox').insert([
      {
        notification_id: notificationId,
        operation_id: operationId,
        source_event_id: command.eventId,
        event_kind: 'notification_upsert',
        revision: 1,
        projection_revision: 1,
        destination: 'feed_search',
        partition_key: notificationId,
        recipient_id: command.recipientId,
        recipient_state_revision: recipientStateRevision,
        payload: {
          notificationId,
          recipientId: command.recipientId,
          revision: 1,
        },
      },
      {
        notification_id: null,
        operation_id: operationId,
        source_event_id: command.eventId,
        event_kind: 'unread_absolute',
        revision: recipientStateRevision,
        projection_revision: recipientStateRevision,
        destination: 'unread_cache',
        partition_key: command.recipientId,
        recipient_id: command.recipientId,
        recipient_state_revision: recipientStateRevision,
        payload: {
          recipientId: command.recipientId,
          count: unreadCount,
          revision: recipientStateRevision,
        },
      },
    ])

    return {
      terminalState: 'active',
      notificationId,
      notification: toCanonicalRecord(notificationRow),
      duplicate: false,
    }
  }
}
