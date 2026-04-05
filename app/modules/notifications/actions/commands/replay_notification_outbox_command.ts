import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { NotificationTransactionRunner } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type {
  NotificationOperationIdentityGenerator,
  NotificationOperationsAuditWriter,
  NotificationOutboxOperationsRepository,
} from '#modules/notifications/actions/ports/outbound/notification_operations_repository'
import type { NotificationOutboxReplaySelector } from '#modules/notifications/domain/notification_outbox'

interface NotificationOutboxReplayInput {
  selector: NotificationOutboxReplaySelector
  reason: string
  now?: Date
}

export interface NotificationOutboxReplayResult {
  affectedCount: number
  outboxIds: string[]
}

function validateReplayInput(input: NotificationOutboxReplayInput): void {
  const reason = input.reason.trim()
  if (reason.length < 10 || reason.length > 500) {
    throw new RangeError('Outbox replay reason must contain 10 to 500 characters')
  }
  if (
    input.selector.ids === undefined &&
    input.selector.fromSequence === undefined &&
    input.selector.toSequence === undefined &&
    input.selector.errorClass === undefined
  ) {
    throw new RangeError('Outbox replay requires a bounded selector')
  }
}

export class ReplayNotificationOutboxCommand {
  constructor(
    private readonly repository: NotificationOutboxOperationsRepository,
    private readonly transactionRunner: NotificationTransactionRunner,
    private readonly auditWriter: NotificationOperationsAuditWriter,
    private readonly identityGenerator: NotificationOperationIdentityGenerator
  ) {}

  async execute(
    input: NotificationOutboxReplayInput,
    execCtx: AuditActionContext
  ): Promise<NotificationOutboxReplayResult> {
    validateReplayInput(input)
    if (!execCtx.userId) {
      throw new UnauthorizedException()
    }
    const now = input.now ?? new Date()

    return this.transactionRunner.run(async (trx) => {
      const replayed = await this.repository.replayDeadLetters(input.selector, now, trx)

      if (replayed.length === 0) {
        const operationId = this.identityGenerator.next()
        await this.auditWriter.write(
          execCtx,
          {
            action: 'notification_outbox.replayed',
            event_name: 'notification.outbox.replayed',
            event_family: 'notification_operations',
            module: 'notifications',
            subsystem: 'outbox',
            workflow: 'notification_outbox_replay',
            stage: 'completed',
            severity: 'info',
            outcome: 'success',
            actor_type: 'operator',
            entity_type: 'notification_outbox_replay',
            entity_id: operationId,
            target_type: 'notification_outbox_selection',
            target_id: operationId,
            retention_class: 'security',
            critical: true,
            new_values: {
              actorId: execCtx.userId,
              reason: input.reason.trim(),
              selector: input.selector,
              affectedCount: 0,
              outboxIds: [],
              replayedAt: now.toISOString(),
            },
          },
          trx
        )
      }
      for (const row of replayed) {
        await this.auditWriter.write(
          execCtx,
          {
            action: 'notification_outbox.replayed',
            event_name: 'notification.outbox.replayed',
            event_family: 'notification_operations',
            module: 'notifications',
            subsystem: 'outbox',
            workflow: 'notification_outbox_replay',
            stage: 'completed',
            severity: 'warning',
            outcome: 'success',
            actor_type: 'operator',
            entity_type: 'notification_outbox',
            entity_id: row.id,
            target_type: 'notification_outbox',
            target_id: row.id,
            retention_class: 'security',
            critical: true,
            new_values: {
              actorId: execCtx.userId,
              reason: input.reason.trim(),
              selector: input.selector,
              affectedCount: replayed.length,
              outboxIds: replayed.map((item) => item.id),
              previousStatus: row.previousStatus,
              resultingStatus: 'pending',
              replayedAt: now.toISOString(),
            },
          },
          trx
        )
      }

      return {
        affectedCount: replayed.length,
        outboxIds: replayed.map((row) => row.id),
      }
    })
  }
}
