import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { PostgresCacheInvalidationOutboxRepository } from '#modules/cache/infra/repositories/invalidation-outbox/postgres_cache_invalidation_outbox_repository'
import { CacheInvalidationOutboxWorker } from '#modules/cache/infra/adapters/invalidation-outbox/cache_invalidation_outbox_worker'
import { sanitizeErrorLogText } from '#modules/errors/public_contracts/error_sanitization'
import env from '#start/env'

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds)
    timer.unref()
  })
}

export default class CacheInvalidationWorkerCommand extends BaseCommand {
  static override commandName = 'cache:invalidation-worker'
  static override description =
    'Drain the durable PostgreSQL cache-invalidation outbox into cache Redis'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Drain one batch and exit' })
  declare once: boolean

  @flags.number({ description: 'Maximum rows claimed per batch' })
  declare batchSize?: number

  @flags.number({ description: 'Idle polling interval in milliseconds' })
  declare pollMs?: number

  @flags.number({ description: 'Maximum concurrent jobs (pattern scans are expensive)' })
  declare concurrency?: number

  override async run(): Promise<void> {
    const pollMs = this.pollMs ?? env.get('CACHE_INVALIDATION_OUTBOX_POLL_MS', 1_000)
    if (!Number.isSafeInteger(pollMs) || pollMs < 100 || pollMs > 60_000) {
      this.logger.error('pollMs must be an integer between 100 and 60000')
      this.exitCode = 1
      return
    }

    const workerId = `${hostname()}:${process.pid}:${randomUUID()}`
    const batchSize = this.batchSize ?? env.get('CACHE_INVALIDATION_OUTBOX_BATCH_SIZE', 25)
    const concurrency = this.concurrency ?? env.get('CACHE_INVALIDATION_OUTBOX_CONCURRENCY', 1)
    const worker = new CacheInvalidationOutboxWorker({
      workerId,
      batchSize,
      concurrency,
      leaseDurationMs: env.get('CACHE_INVALIDATION_OUTBOX_LEASE_MS', 60_000),
      heartbeatIntervalMs: env.get('CACHE_INVALIDATION_OUTBOX_HEARTBEAT_MS', 15_000),
      maxAttempts: env.get('CACHE_INVALIDATION_OUTBOX_MAX_ATTEMPTS', 10),
      retryBaseMs: env.get('CACHE_INVALIDATION_OUTBOX_RETRY_BASE_MS', 1_000),
      retryCapMs: env.get('CACHE_INVALIDATION_OUTBOX_RETRY_CAP_MS', 300_000),
    })
    const retentionDays = env.get('CACHE_INVALIDATION_OUTBOX_RETENTION_DAYS', 7)
    if (!Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 365) {
      this.logger.error('CACHE_INVALIDATION_OUTBOX_RETENTION_DAYS must be between 1 and 365')
      this.exitCode = 1
      return
    }
    const lifecycle = { stopping: false }
    let iteration = 0
    let lastErrorLogAt = 0

    const stop = () => {
      lifecycle.stopping = true
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)

    this.logger.info(
      `Cache invalidation worker started (worker=${workerId}, batch=${String(
        batchSize
      )}, concurrency=${String(concurrency)})`
    )

    try {
      while (!lifecycle.stopping) {
        try {
          const result = await worker.runOnce()
          iteration += 1

          if (result.claimed > 0) {
            this.logger.info(
              `Cache invalidation batch claimed=${String(result.claimed)} processed=${String(
                result.processed
              )} retried=${String(result.retried)} dead_lettered=${String(
                result.deadLettered
              )} lease_lost=${String(result.leaseLost)}`
            )
          }
          if (result.deadLettered > 0 || result.leaseLost > 0) {
            this.logger.error(
              'Cache invalidation worker requires operator attention: dead-letter or lease loss detected'
            )
          }

          if (iteration % 100 === 0) {
            const retentionBoundary = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1_000)
            const purged = await new PostgresCacheInvalidationOutboxRepository().purgeProcessedBefore(
              retentionBoundary
            )
            if (purged > 0) {
              this.logger.info(`Purged ${String(purged)} processed cache invalidation rows`)
            }
          }

          if (this.once) {
            return
          }
          if (result.claimed === 0) {
            await wait(pollMs)
          }
        } catch (error) {
          const now = Date.now()
          if (now - lastErrorLogAt >= 60_000 || this.once) {
            this.logger.error(
              `Cache invalidation worker failed: ${sanitizeErrorLogText(
                error instanceof Error ? error.message : error
              )}`
            )
            lastErrorLogAt = now
          }
          if (this.once) {
            this.exitCode = 1
            return
          }
          await wait(Math.max(pollMs, 5_000))
        }
      }
    } finally {
      process.removeListener('SIGINT', stop)
      process.removeListener('SIGTERM', stop)
      this.logger.info('Cache invalidation worker stopped')
    }
  }
}
