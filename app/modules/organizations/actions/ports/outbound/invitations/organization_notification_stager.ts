import type { OrganizationTransaction } from '../organization_transaction.js'

import type { NotificationCommandV1Input } from '#modules/notifications/public_contracts/notification_command'


export interface OrganizationNotificationStager {
  stage(
    command: NotificationCommandV1Input,
    options: { trx: OrganizationTransaction; now?: Date }
  ): Promise<unknown>
}
