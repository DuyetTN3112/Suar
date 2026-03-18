import type { NotificationCommandV1Input } from '#modules/notifications/public_contracts/notification_command'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface TaskNotificationStager {
  stage(
    command: NotificationCommandV1Input,
    options: { trx: TaskTransaction; now?: Date }
  ): Promise<unknown>
}
