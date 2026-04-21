import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { PostgresCacheInvalidationOutboxRepository } from '#modules/cache/infra/repositories/invalidation-outbox/postgres_cache_invalidation_outbox_repository'

export default class CacheInvalidationStatusCommand extends BaseCommand {
  static override commandName = 'cache:invalidation-status'
  static override description =
    'Show cache invalidation outbox pending, retry, lease, lag, and dead-letter health'

  static override options: CommandOptions = {
    startApp: true,
  }

  override async run(): Promise<void> {
    const status = await new PostgresCacheInvalidationOutboxRepository().operationalStatus()
    this.logger.info(
      JSON.stringify({
        component: 'cache_invalidation_outbox',
        ...status,
      })
    )

    if (!status.configured) {
      this.logger.error('Cache invalidation outbox schema is not installed')
      this.exitCode = 2
      return
    }
    if (status.deadLetter > 0) {
      this.logger.error('Cache invalidation outbox has dead-letter records requiring review')
      this.exitCode = 2
    }
  }
}
