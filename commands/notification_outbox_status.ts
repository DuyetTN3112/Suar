import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { PostgresNotificationOutboxRepository } from '#modules/notifications/infra/repositories/postgres_notification_outbox_repository'

export default class NotificationOutboxStatusCommand extends BaseCommand {
  static override commandName = 'notification:outbox-status'
  static override description =
    'Show notification outbox pending, retry, lease, lag, and dead-letter health'

  static override options: CommandOptions = {
    startApp: true,
  }

  override async run(): Promise<void> {
    const status = await new PostgresNotificationOutboxRepository().operationalStatus()
    this.logger.info(
      JSON.stringify({
        component: 'notification_outbox',
        ...status,
      })
    )

    if (status.deadLetter > 0) {
      this.logger.error('Notification outbox has dead-letter records requiring operator review')
      this.exitCode = 2
    }
  }
}

