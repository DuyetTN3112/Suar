import { randomUUID } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { NotificationTransaction } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type {
  NotificationFanoutStageWrite,
  NotificationFanoutStagingRepository,
} from '#modules/notifications/actions/ports/outbound/notification_fanout_staging_repository'
import { NotificationFanoutConflictError } from '#modules/notifications/domain/notification_fanout_policy'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'

const TARGET_INSERT_CHUNK_SIZE = 500

interface ExistingFanoutJob {
  id: string
  template_fingerprint: string
  target_fingerprint: string
  target_count: number | string
}

function assertExistingJobMatches(
  existing: ExistingFanoutJob,
  templateFingerprint: string,
  targetFingerprint: string
): void {
  if (existing.template_fingerprint !== templateFingerprint) {
    throw new NotificationFanoutConflictError('template')
  }
  if (existing.target_fingerprint !== targetFingerprint) {
    throw new NotificationFanoutConflictError('target_snapshot')
  }
}

export class PostgresNotificationFanoutStagingRepository implements NotificationFanoutStagingRepository {
  async stage(input: NotificationFanoutStageWrite, transaction: NotificationTransaction) {
    const trx = transaction as TransactionClientContract
    const scopeId = input.command.scope.kind === 'system' ? null : input.command.scope.id
    const jobId = randomUUID()
    const insertedRows = (await trx
      .table('notification_fanout_jobs')
      .insert({
        id: jobId,
        source_event_name: input.template.eventName,
        business_event_id: input.template.businessEventId,
        template_fingerprint: input.templateFingerprint,
        target_fingerprint: input.targetFingerprint,
        notification_type: input.command.type,
        schema_version: input.command.schemaVersion,
        scope_type: input.command.scope.kind,
        scope_id: scopeId,
        actor_type: input.command.actor?.type ?? null,
        actor_id: input.command.actor?.id ?? null,
        subject_type: input.command.subject?.type ?? null,
        subject_id: input.command.subject?.id ?? null,
        parameters: input.command.parameters,
        occurred_at: input.command.occurredAt,
        correlation_id: input.command.correlationId ?? null,
        dedupe_key: input.command.dedupeKey ?? null,
        target_count: input.recipients.length,
        created_at: input.now,
        updated_at: input.now,
      })
      .onConflict(['source_event_name', 'business_event_id'])
      .ignore()
      .returning('id')) as Array<{ id: string }>

    if (insertedRows.length === 0) {
      const existing = (await trx
        .from('notification_fanout_jobs')
        .select('id', 'template_fingerprint', 'target_fingerprint', 'target_count')
        .where('source_event_name', input.template.eventName)
        .where('business_event_id', input.template.businessEventId)
        .forUpdate()
        .first()) as ExistingFanoutJob | undefined
      if (!existing) {
        throw new InvariantViolationException(
          'Notification fanout identity conflict could not be resolved'
        )
      }
      assertExistingJobMatches(existing, input.templateFingerprint, input.targetFingerprint)
      return {
        status: 'duplicate' as const,
        jobId: existing.id,
        targetCount: Number(existing.target_count),
      }
    }

    for (let offset = 0; offset < input.recipients.length; offset += TARGET_INSERT_CHUNK_SIZE) {
      const chunk = input.recipients.slice(offset, offset + TARGET_INSERT_CHUNK_SIZE)
      await trx.table('notification_fanout_targets').multiInsert(
        chunk.map((recipientId) => ({
          id: randomUUID(),
          job_id: jobId,
          recipient_id: recipientId,
          event_id: buildNotificationEventId({
            eventName: input.template.eventName,
            businessEventId: input.template.businessEventId,
            recipientId,
          }),
          status: 'pending',
          available_at: input.now,
          created_at: input.now,
          updated_at: input.now,
        }))
      )
    }

    return {
      status: 'staged' as const,
      jobId,
      targetCount: input.recipients.length,
    }
  }
}
