import type { AuditLogWriter } from '#modules/audit/public_contracts/audit_log_writer'
import type { NotificationTransaction } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type {
  NotificationFanoutReplayRow,
  NotificationFanoutReplaySelector,
} from '#modules/notifications/domain/notification_fanout'
import type {
  NotificationOutboxReplayRow,
  NotificationOutboxReplaySelector,
} from '#modules/notifications/domain/notification_outbox'
import type {
  NotificationOutboxDeadLetterPreviewInput,
  NotificationOutboxDeadLetterPreviewPage,
  NotificationOutboxDiscardRow,
} from '#modules/notifications/domain/notification_outbox_dlq'

export interface NotificationFanoutReplayRepository {
  replayDeadLetters(
    selector: NotificationFanoutReplaySelector,
    now: Date,
    transaction: NotificationTransaction
  ): Promise<NotificationFanoutReplayRow[]>
}

export interface NotificationOutboxOperationsRepository {
  replayDeadLetters(
    selector: NotificationOutboxReplaySelector,
    now: Date,
    transaction: NotificationTransaction
  ): Promise<NotificationOutboxReplayRow[]>
  previewDeadLetters(
    input: NotificationOutboxDeadLetterPreviewInput
  ): Promise<NotificationOutboxDeadLetterPreviewPage>
  discardDeadLetters(
    input: {
      ids: string[]
      actorId: string
      reason: string
      now: Date
    },
    transaction: NotificationTransaction
  ): Promise<NotificationOutboxDiscardRow[]>
}

export interface NotificationOperationIdentityGenerator {
  next(): string
}

export type NotificationOperationsAuditWriter = Pick<AuditLogWriter, 'write'>
