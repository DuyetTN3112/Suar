import type { NotificationTransaction } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type {
  NotificationFanoutClaimInput,
  NotificationFanoutFailureInput,
  NotificationFanoutLeaseInput,
  NotificationFanoutRetryInput,
  NotificationFanoutWorkTarget,
} from '#modules/notifications/domain/notification_fanout'

export interface NotificationFanoutRepository {
  claimBatch(input: NotificationFanoutClaimInput): Promise<NotificationFanoutWorkTarget[]>
  lockForProcessing(
    input: NotificationFanoutLeaseInput,
    transaction: NotificationTransaction
  ): Promise<NotificationFanoutWorkTarget | null>
  markProcessed(
    input: NotificationFanoutLeaseInput & { notificationId: string },
    transaction: NotificationTransaction
  ): Promise<boolean>
  retry(input: NotificationFanoutRetryInput): Promise<boolean>
  deadLetter(input: NotificationFanoutFailureInput): Promise<boolean>
}
