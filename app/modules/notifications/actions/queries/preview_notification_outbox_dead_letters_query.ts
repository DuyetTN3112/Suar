import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type {
  NotificationOperationsAuditWriter,
  NotificationOutboxOperationsRepository,
} from '#modules/notifications/actions/ports/outbound/notification_operations_repository'
import type {
  NotificationOutboxDeadLetterPreviewInput,
  NotificationOutboxDeadLetterPreviewPage,
} from '#modules/notifications/domain/notification_outbox_dlq'

export class PreviewNotificationOutboxDeadLettersQuery {
  constructor(
    private readonly repository: Pick<NotificationOutboxOperationsRepository, 'previewDeadLetters'>,
    private readonly auditWriter: NotificationOperationsAuditWriter
  ) {}

  async execute(
    input: NotificationOutboxDeadLetterPreviewInput,
    execCtx: AuditActionContext
  ): Promise<NotificationOutboxDeadLetterPreviewPage> {
    if (!execCtx.userId) {
      throw new UnauthorizedException()
    }
    const actorId = execCtx.userId
    const page = await this.repository.previewDeadLetters(input)

    await this.auditWriter.write(execCtx, {
      action: 'notification_outbox.dlq_previewed',
      event_name: 'notification.outbox.dlq_previewed',
      event_family: 'notification_operations',
      module: 'notifications',
      subsystem: 'outbox',
      workflow: 'notification_outbox_dlq_administration',
      stage: 'previewed',
      severity: 'info',
      outcome: 'success',
      actor_type: 'operator',
      entity_type: 'notification_outbox_dlq',
      entity_id: actorId,
      target_type: 'notification_outbox_dlq',
      target_id: actorId,
      retention_class: 'security',
      critical: true,
      new_values: {
        actorId,
        selector: input.selector,
        limit: input.limit,
        ...(input.destination === undefined ? {} : { destination: input.destination }),
        ...(input.afterSequence === undefined ? {} : { afterSequence: input.afterSequence }),
        returnedIds: page.items.map((item) => item.id),
        hasMore: page.hasMore,
        previewedAt: new Date().toISOString(),
      },
    })

    return page
  }
}
