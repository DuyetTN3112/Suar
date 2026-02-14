import { Result, BaseCheck } from '@adonisjs/core/health'
import type { HealthCheckResult } from '@adonisjs/core/types/health'

import env from '#start/env'

interface CacheInvalidationBacklogSnapshot {
  configured: boolean
  pending: number
  leased: number
  deadLetter: number
  oldestOutstandingAt: Date | null
}

interface CacheInvalidationBacklogReader {
  backlog(): Promise<CacheInvalidationBacklogSnapshot>
}

const PENDING_WARNING_THRESHOLD = 1_000
const PENDING_FAILURE_THRESHOLD = 10_000
export class CacheInvalidationOutboxHealthCheck extends BaseCheck {
  public readonly name = 'cache_invalidation_outbox'
  private readonly warningAgeSeconds: number
  private readonly failureAgeSeconds: number

  constructor(
    private readonly reader: CacheInvalidationBacklogReader,
    private readonly now: () => Date = () => new Date()
  ) {
    super()
    this.warningAgeSeconds = env.get('CACHE_INVALIDATION_OUTBOX_WARN_AGE_SECONDS', 30)
    this.failureAgeSeconds = env.get('CACHE_INVALIDATION_OUTBOX_FAIL_AGE_SECONDS', 300)

    if (
      !Number.isSafeInteger(this.warningAgeSeconds) ||
      this.warningAgeSeconds < 1 ||
      !Number.isSafeInteger(this.failureAgeSeconds) ||
      this.failureAgeSeconds <= this.warningAgeSeconds
    ) {
      throw new RangeError('Cache invalidation outbox health ages require 1 <= warning < failure')
    }
  }

  async run(): Promise<HealthCheckResult> {
    try {
      const backlog = await this.reader.backlog()
      if (!backlog.configured) {
        return Result.failed('Cache invalidation outbox schema is not installed')
          .mergeMetaData({ configured: false })
          .toJSON()
      }

      const oldestAgeSeconds = backlog.oldestOutstandingAt
        ? Math.max(
            0,
            Math.floor((this.now().getTime() - backlog.oldestOutstandingAt.getTime()) / 1_000)
          )
        : 0
      const metadata = {
        configured: true,
        pending: backlog.pending,
        leased: backlog.leased,
        dead_letter: backlog.deadLetter,
        oldest_outstanding_age_seconds: oldestAgeSeconds,
        warning_age_seconds: this.warningAgeSeconds,
        failure_age_seconds: this.failureAgeSeconds,
      }

      if (
        backlog.deadLetter > 0 ||
        backlog.pending >= PENDING_FAILURE_THRESHOLD ||
        oldestAgeSeconds >= this.failureAgeSeconds
      ) {
        return Result.failed('Cache invalidation outbox requires operator action')
          .mergeMetaData(metadata)
          .toJSON()
      }

      if (
        backlog.pending >= PENDING_WARNING_THRESHOLD ||
        oldestAgeSeconds >= this.warningAgeSeconds
      ) {
        return Result.warning('Cache invalidation outbox is falling behind')
          .mergeMetaData(metadata)
          .toJSON()
      }

      return Result.ok('Cache invalidation outbox is current').mergeMetaData(metadata).toJSON()
    } catch (error) {
      return Result.failed('Unable to inspect cache invalidation outbox')
        .mergeMetaData({
          configured: null,
          error_class: error instanceof Error ? error.constructor.name : 'UnknownError',
        })
        .toJSON()
    }
  }
}
