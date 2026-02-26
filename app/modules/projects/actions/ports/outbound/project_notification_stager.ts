import type { ProjectTransaction } from './project_transaction.js'

import type { NotificationCommandV1Input } from '#modules/notifications/public_contracts/notification_command'

export interface ProjectNotificationStager {
  stage(
    command: NotificationCommandV1Input,
    options: { trx: ProjectTransaction; now?: Date }
  ): Promise<unknown>
}
