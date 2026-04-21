import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { PostgresNotificationFanoutRepository } from '#modules/notifications/infra/repositories/notification-outbox/postgres_notification_fanout_repository'

export default class NotificationFanoutStatusCommand extends BaseCommand {
  static override commandName = 'notification:fanout-status'
  static override description =
    'Show notification fanout pending, retry, lease, lag, job, and dead-letter health'

  static override options: CommandOptions = {
    startApp: true,
  }

  override async run(): Promise<void> {
    const status = await new PostgresNotificationFanoutRepository().operationalStatus()
    this.logger.info(
      JSON.stringify({
        component: 'notification_fanout',
        ...status,
      })
    )
    if (status.deadLetter > 0 || status.completedWithErrorsJobs > 0) {
      this.logger.error('Notification fanout has dead-letter targets requiring operator review')
      this.exitCode = 2
    }
  }
}
