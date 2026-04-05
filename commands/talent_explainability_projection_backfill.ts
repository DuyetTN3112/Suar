import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { reviewPublicApi } from '#composition/review_public_api_composition'
import { userPublicApi } from '#composition/user_application_composition'

const DEFAULT_BATCH_SIZE = 250
const MAX_BATCH_SIZE = 1_000

export default class TalentExplainabilityProjectionBackfillCommand extends BaseCommand {
  static override commandName = 'talent-explainability:projection-backfill'
  static override description =
    'Durably backfill versioned Reviews explainability facts into Users and search projections'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.number({ description: 'Users processed per provider batch (1-1000)' })
  declare batchSize?: number

  @flags.number({ description: 'Optional maximum number of users to process' })
  declare limit?: number

  override async run(): Promise<void> {
    const batchSize = this.batchSize ?? DEFAULT_BATCH_SIZE
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > MAX_BATCH_SIZE) {
      this.logger.error('--batch-size must be an integer between 1 and 1000')
      this.exitCode = 1
      return
    }
    if (
      this.limit !== undefined &&
      (!Number.isSafeInteger(this.limit) || this.limit < 1)
    ) {
      this.logger.error('--limit must be a positive integer')
      this.exitCode = 1
      return
    }

    let afterId: string | null = null
    let scanned = 0
    let staged = 0

    while (this.limit === undefined || scanned < this.limit) {
      const remaining = this.limit === undefined ? batchSize : this.limit - scanned
      const pageSize = Math.min(batchSize, remaining)
      const userIds = await userPublicApi.listTalentExplainabilityProjectionTargetIds(
        afterId,
        pageSize
      )
      if (userIds.length === 0) break

      const projectedAt = new Date().toISOString()
      staged += await reviewPublicApi.stageTalentExplainabilityProjectionBackfillV1(
        userIds,
        projectedAt
      )

      scanned += userIds.length
      afterId = userIds.at(-1) ?? afterId
      this.logger.info(
        `Talent explainability backfill progress scanned=${String(
          scanned
        )} staged=${String(staged)}`
      )
    }

    this.logger.success(
      `Talent explainability backfill complete scanned=${String(
        scanned
      )} staged=${String(staged)}`
    )
  }
}
