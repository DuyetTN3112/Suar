import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { authorizeCacheInvalidationOperatorQuery } from '#composition/cache_invalidation_operator_composition'
import { replayCacheInvalidationOutboxCommand } from '#composition/cache_invalidation_replay_composition'
import { type ReplayCacheInvalidationOutboxInput } from '#modules/cache/actions/commands/replay_cache_invalidation_outbox_command'
import type { CacheInvalidationOutboxReplaySelector } from '#modules/cache/public_contracts/cache_invalidation_outbox_types'
import { sanitizeErrorLogText } from '#modules/errors/public_contracts/error_sanitization'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default class CacheInvalidationReplayCommand extends BaseCommand {
  static override commandName = 'cache:invalidation-replay'
  static override description =
    'Replay selected cache invalidation dead-letter jobs with authorization and immutable audit'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({ description: 'Authenticated operator user UUID' })
  declare actorId?: string

  @flags.string({ description: 'Required operator reason (10-500 characters)' })
  declare reason?: string

  @flags.string({ description: 'Comma-separated outbox UUIDs (maximum 100)' })
  declare ids?: string

  @flags.number({ description: 'Inclusive lower outbox sequence' })
  declare fromSequence?: number

  @flags.number({ description: 'Inclusive upper outbox sequence' })
  declare toSequence?: number

  @flags.string({ description: 'Optional sanitized error class filter' })
  declare errorClass?: string

  override async run(): Promise<void> {
    if (!this.actorId || !this.reason || !UUID_PATTERN.test(this.actorId)) {
      this.logger.error('--actor-id must be a UUID and --reason is required')
      this.exitCode = 1
      return
    }

    const actor = await authorizeCacheInvalidationOperatorQuery.execute(this.actorId)
    if (!actor) {
      this.logger.error('Actor is not an active authorized cache operations user')
      this.exitCode = 1
      return
    }

    const parsedIds = this.ids
      ?.split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
    const selector: CacheInvalidationOutboxReplaySelector = {
      ...(parsedIds === undefined ? {} : { ids: parsedIds }),
      ...(this.fromSequence === undefined ? {} : { fromSequence: this.fromSequence }),
      ...(this.toSequence === undefined ? {} : { toSequence: this.toSequence }),
      ...(this.errorClass === undefined ? {} : { errorClass: this.errorClass }),
    }

    try {
      const input: ReplayCacheInvalidationOutboxInput = {
        selector,
        reason: this.reason,
      }
      const result = await replayCacheInvalidationOutboxCommand.execute(input, {
        userId: actor.id,
        ip: '0.0.0.0',
        userAgent: 'cache-invalidation-outbox-replay-cli',
        organizationId: null,
        actorRoleSurface: actor.systemRole,
        requestId: null,
        traceId: null,
        workflowId: 'cache_invalidation_outbox_replay',
      })

      this.logger.success(
        `Cache invalidation replay accepted affected=${String(
          result.affectedCount
        )} ids=${result.outboxIds.join(',')}`
      )
    } catch (error) {
      this.logger.error(sanitizeErrorLogText(error instanceof Error ? error.message : error))
      this.exitCode = 1
    }
  }
}
