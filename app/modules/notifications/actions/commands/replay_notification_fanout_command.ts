import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { NotificationTransactionRunner } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type {
  NotificationFanoutReplayRepository,
  NotificationOperationsAuditWriter,
} from '#modules/notifications/actions/ports/outbound/notification_operations_repository'
import type { NotificationFanoutReplaySelector } from '#modules/notifications/domain/notification_fanout'

interface NotificationFanoutReplayInput {
  selector: NotificationFanoutReplaySelector
  reason: string
  now?: Date
}

export interface NotificationFanoutReplayResult {
  affectedCount: number
  targetIds: string[]
}

function validateReplayInput(input: NotificationFanoutReplayInput): void {
  const reason = input.reason.trim()
  if (reason.length < 10 || reason.length > 500) {
    throw new RangeError('Fanout replay reason must contain 10 to 500 characters')
  }
  if (
    input.selector.ids === undefined &&
    input.selector.jobId === undefined &&
    input.selector.fromSequence === undefined &&
    input.selector.toSequence === undefined &&
    input.selector.errorClass === undefined
  ) {
    throw new RangeError('Fanout replay requires a bounded selector')
  }
}

export class ReplayNotificationFanoutCommand {
  constructor(
    private readonly repository: NotificationFanoutReplayRepository,
    private readonly transactionRunner: NotificationTransactionRunner,
    private readonly auditWriter: NotificationOperationsAuditWriter
  ) {}

  async execute(
    input: NotificationFanoutReplayInput,
    execCtx: AuditActionContext
  ): Promise<NotificationFanoutReplayResult> {
    validateReplayInput(input)
    if (!execCtx.userId) {
      throw new UnauthorizedException()
    }
    const now = input.now ?? new Date()

    return this.transactionRunner.run(async (trx) => {
      const replayed = await this.repository.replayDeadLetters(input.selector, now, trx)
      for (const row of replayed) {
        await this.auditWriter.write(
          execCtx,
          {
            action: 'notification_fanout.replayed',
            event_name: 'notification.fanout.replayed',
            event_family: 'notification_operations',
            module: 'notifications',
            subsystem: 'fanout',
            workflow: 'notification_fanout_replay',
            stage: 'completed',
            severity: 'warning',
            outcome: 'success',
            actor_type: 'operator',
            entity_type: 'notification_fanout_target',
            entity_id: row.id,
            target_type: 'notification_fanout_target',
            target_id: row.id,
            retention_class: 'security',
            critical: true,
            new_values: {
              actorId: execCtx.userId,
              reason: input.reason.trim(),
              selector: input.selector,
              affectedCount: replayed.length,
              targetIds: replayed.map((item) => item.id),
              jobId: row.jobId,
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
        targetIds: replayed.map((row) => row.id),
      }
    })
  }
}
