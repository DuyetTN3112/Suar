import type { NotificationTransaction } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type { NotificationCommandV1 } from '#modules/notifications/domain/notification_command'
import type {
  NotificationFanoutStageResult,
  NotificationFanoutTemplateV1Input,
} from '#modules/notifications/domain/notification_fanout'

export interface NotificationFanoutStageWrite {
  template: NotificationFanoutTemplateV1Input
  command: NotificationCommandV1
  recipients: string[]
  templateFingerprint: string
  targetFingerprint: string
  now: Date
}

export interface NotificationFanoutStagingRepository {
  stage(
    input: NotificationFanoutStageWrite,
    transaction: NotificationTransaction
  ): Promise<NotificationFanoutStageResult>
}
