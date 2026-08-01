import type { UserTransaction } from './user_transaction.js'

import type { NotificationCommandV1Input } from '#modules/notifications/public_contracts/notification_command'

export interface UserNotificationStager {
  stage(
    command: NotificationCommandV1Input,
    options: { trx: UserTransaction; now?: Date }
  ): Promise<unknown>
}
