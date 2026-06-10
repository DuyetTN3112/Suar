import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/notifications/actions/base_command'
import type { NotificationTransactionRunner } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type {
  NotificationOperationsAuditWriter,
  NotificationOutboxOperationsRepository,
} from '#modules/notifications/actions/ports/outbound/notification_operations_repository'
import { NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT } from '#modules/notifications/domain/notification-outbox/notification_outbox_dlq'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export interface DiscardNotificationOutboxDeadLettersInput {
  ids: string[]
  reason: string
  confirmation: string
  now?: Date
}

export interface DiscardNotificationOutboxDeadLettersResult {
  affectedCount: number
  outboxIds: string[]
}

export interface DiscardNotificationOutboxDeadLettersCommandInput {
  readonly input: DiscardNotificationOutboxDeadLettersInput
  readonly execCtx: AuditActionContext
}

function validateIds(ids: string[]): string[] {
  const uniqueIds = [...new Set(ids)]
  if (
    uniqueIds.length !== ids.length ||
    uniqueIds.length < 1 ||
    uniqueIds.length > NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT ||
    uniqueIds.some((id) => !UUID_PATTERN.test(id))
  ) {
    throw new RangeError(
      `Outbox disposition requires 1 to ${NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT} unique UUIDs`
    )
  }
  return uniqueIds
}

function validateReason(reason: string): string {
  const normalized = reason.trim()
  if (normalized.length < 10 || normalized.length > 500) {
    throw new RangeError('Outbox disposition reason must contain 10 to 500 characters')
  }
  return normalized
}

export class DiscardNotificationOutboxDeadLettersCommand extends BaseCommand<
  DiscardNotificationOutboxDeadLettersCommandInput,
  DiscardNotificationOutboxDeadLettersResult
> {
  constructor(
    private readonly repository: Pick<NotificationOutboxOperationsRepository, 'discardDeadLetters'>,
    private readonly transactionRunner: NotificationTransactionRunner,
    private readonly auditWriter: NotificationOperationsAuditWriter
  ) {
    super()
  }

  execute(
    input: DiscardNotificationOutboxDeadLettersCommandInput
  ): Promise<DiscardNotificationOutboxDeadLettersResult>
  async execute(
    input: DiscardNotificationOutboxDeadLettersInput,
    execCtx: AuditActionContext
  ): Promise<DiscardNotificationOutboxDeadLettersResult>
  override async execute(
    inputOrCommandInput:
      | DiscardNotificationOutboxDeadLettersInput
      | DiscardNotificationOutboxDeadLettersCommandInput,
    legacyExecCtx?: AuditActionContext
  ): Promise<DiscardNotificationOutboxDeadLettersResult> {
    let input: DiscardNotificationOutboxDeadLettersInput
    let execCtx: AuditActionContext
    if ('input' in inputOrCommandInput) {
      input = inputOrCommandInput.input
      execCtx = inputOrCommandInput.execCtx
    } else {
      if (!legacyExecCtx) {
        throw new UnauthorizedException()
      }
      input = inputOrCommandInput
      execCtx = legacyExecCtx
    }

    if (!execCtx.userId) {
      throw new UnauthorizedException()
    }
    const actorId = execCtx.userId
    if (input.confirmation !== 'DISCARD') {
      throw new RangeError('Outbox disposition requires confirmation=DISCARD')
    }
    const ids = validateIds(input.ids)
    const reason = validateReason(input.reason)
    const now = input.now ?? new Date()

    return this.transactionRunner.run(async (trx) => {
      const discarded = await this.repository.discardDeadLetters({ ids, actorId, reason, now }, trx)

      for (const row of discarded) {
        await this.auditWriter.write(
          execCtx,
          {
            action: 'notification_outbox.discarded',
            event_name: 'notification.outbox.discarded',
            event_family: 'notification_operations',
            module: 'notifications',
            subsystem: 'outbox',
            workflow: 'notification_outbox_dlq_administration',
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
              actorId,
              reason,
              affectedCount: discarded.length,
              outboxIds: discarded.map((item) => item.id),
              previousStatus: row.previousStatus,
              resultingStatus: 'discarded',
              disposedAt: now.toISOString(),
            },
          },
          trx
        )
      }

      return {
        affectedCount: discarded.length,
        outboxIds: discarded.map((row) => row.id),
      }
    })
  }
}
