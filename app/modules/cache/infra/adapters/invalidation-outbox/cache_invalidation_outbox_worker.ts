import type {
  CacheInvalidationOutboxJob,
  CacheInvalidationOutboxRepository,
  CachePatternInvalidator,
} from '#modules/cache/domain/invalidation-outbox/cache_invalidation_outbox'
import {
  InvalidCacheInvalidationPayloadError,
  normalizeCacheInvalidationPatterns,
} from '#modules/cache/domain/invalidation-outbox/cache_invalidation_outbox'
import { PostgresCacheInvalidationOutboxRepository } from '#modules/cache/infra/repositories/invalidation-outbox/postgres_cache_invalidation_outbox_repository'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import {
  buildPlatformTraceContext,
  createCorrelationKey,
  platformOperationalLogger,
  type PlatformEvent,
  type PlatformOperationalLogger,
} from '#modules/observability/public_contracts/platform_observability'

interface CacheInvalidationOutboxWorkerOptions {
  repository?: CacheInvalidationOutboxRepository
  invalidator?: CachePatternInvalidator
  workerId: string
  now?: () => Date
  random?: () => number
  batchSize?: number
  concurrency?: number
  leaseDurationMs?: number
  heartbeatIntervalMs?: number
  maxAttempts?: number
  retryBaseMs?: number
  retryCapMs?: number
  operationalLogger?: Pick<PlatformOperationalLogger, 'log'>
}

interface CacheInvalidationLeaseState {
  heartbeatRunning: boolean
  lost: boolean
  settled: boolean
}

export interface CacheInvalidationOutboxRunResult {
  claimed: number
  processed: number
  retried: number
  deadLettered: number
  leaseLost: number
}

const DEFAULTS = {
  batchSize: 25,
  concurrency: 1,
  leaseDurationMs: 60_000,
  heartbeatIntervalMs: 15_000,
  maxAttempts: 10,
  retryBaseMs: 1_000,
  retryCapMs: 300_000,
} as const

const MAX_ERROR_MESSAGE_BYTES = 1_024

type CacheInvalidationLeaseLossStage =
  | 'heartbeat_rejected'
  | 'heartbeat_failed'
  | 'acknowledge_rejected'
  | 'retry_rejected'
  | 'dead_letter_rejected'

function validateInteger(name: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be between ${minimum} and ${maximum}`)
  }
}

function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const redacted = raw
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b(password|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi, '$1=[REDACTED]')

  let result = ''
  for (const character of redacted) {
    if (Buffer.byteLength(result + character, 'utf8') > MAX_ERROR_MESSAGE_BYTES) {
      break
    }
    result += character
  }
  return result
}

function sanitizeErrorClass(error: unknown): string {
  const raw = error instanceof Error ? error.constructor.name : 'UnknownCacheInvalidationError'
  return raw.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 200) || 'UnknownCacheInvalidationError'
}

function buildCacheInvalidationLeaseLossEvent(
  job: CacheInvalidationOutboxJob,
  stage: CacheInvalidationLeaseLossStage,
  error?: unknown
): PlatformEvent {
  const serializedError = serializeObservabilityError(error)

  return {
    event_name: 'cache.invalidation_outbox.lease_lost',
    event_family: 'cache',
    module: 'cache',
    subsystem: 'cache_invalidation_outbox',
    workflow: 'cache_invalidation_delivery',
    stage,
    severity: 'warn',
    outcome: 'warning',
    occurred_at: new Date().toISOString(),
    actor: {
      initiator_type: 'job',
      role_surface: 'cache_invalidation_outbox_worker',
    },
    request: null,
    trace: buildPlatformTraceContext({
      workflow: 'cache_invalidation_delivery',
      correlationKey: createCorrelationKey([job.id, stage]),
    }),
    target: {
      type: 'cache_invalidation_outbox_job',
      id: job.id,
      scope: 'lease',
    },
    change: {
      lease_outcome: 'lost',
      mutation_stage: stage,
    },
    runtime: {
      attempt_count: job.attemptCount,
    },
    error: serializedError
      ? {
          class: serializedError['class'] ?? 'UnknownError',
        }
      : null,
    compliance: {
      redaction_applied: error !== undefined,
      retention_class: 'transient_runtime',
      contains_sensitive_fields: false,
      contains_user_input: false,
    },
  }
}

export class CacheInvalidationOutboxWorker {
  private readonly repository: CacheInvalidationOutboxRepository
  private readonly invalidator: CachePatternInvalidator
  private readonly workerId: string
  private readonly now: () => Date
  private readonly random: () => number
  private readonly batchSize: number
  private readonly concurrency: number
  private readonly leaseDurationMs: number
  private readonly heartbeatIntervalMs: number
  private readonly maxAttempts: number
  private readonly retryBaseMs: number
  private readonly retryCapMs: number
  private readonly operationalLogger: Pick<PlatformOperationalLogger, 'log'>

  constructor(options: CacheInvalidationOutboxWorkerOptions) {
    this.repository = options.repository ?? new PostgresCacheInvalidationOutboxRepository()
    this.invalidator = options.invalidator ?? cacheStore
    this.workerId = options.workerId
    this.now = options.now ?? (() => new Date())
    this.random = options.random ?? Math.random
    this.batchSize = options.batchSize ?? DEFAULTS.batchSize
    this.concurrency = options.concurrency ?? DEFAULTS.concurrency
    this.leaseDurationMs = options.leaseDurationMs ?? DEFAULTS.leaseDurationMs
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? DEFAULTS.heartbeatIntervalMs
    this.maxAttempts = options.maxAttempts ?? DEFAULTS.maxAttempts
    this.retryBaseMs = options.retryBaseMs ?? DEFAULTS.retryBaseMs
    this.retryCapMs = options.retryCapMs ?? DEFAULTS.retryCapMs
    this.operationalLogger = options.operationalLogger ?? platformOperationalLogger

    validateInteger('batchSize', this.batchSize, 1, 100)
    validateInteger('concurrency', this.concurrency, 1, 4)
    validateInteger('leaseDurationMs', this.leaseDurationMs, 1_000, 300_000)
    validateInteger('heartbeatIntervalMs', this.heartbeatIntervalMs, 100, this.leaseDurationMs - 1)
    validateInteger('maxAttempts', this.maxAttempts, 1, 100)
    validateInteger('retryBaseMs', this.retryBaseMs, 100, 300_000)
    validateInteger('retryCapMs', this.retryCapMs, this.retryBaseMs, 3_600_000)
    if (this.workerId.trim().length === 0 || this.workerId.length > 200) {
      throw new RangeError('workerId must contain 1 to 200 characters')
    }
  }

  async runOnce(): Promise<CacheInvalidationOutboxRunResult> {
    const jobs = await this.repository.claimBatch({
      workerId: this.workerId,
      batchSize: this.batchSize,
      leaseDurationMs: this.leaseDurationMs,
      now: this.now(),
    })
    const result: CacheInvalidationOutboxRunResult = {
      claimed: jobs.length,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    }
    const leaseStates = new Map<string, CacheInvalidationLeaseState>(
      jobs.map((job) => [
        job.id,
        {
          heartbeatRunning: false,
          lost: false,
          settled: false,
        },
      ])
    )
    const batchInvalidations = new Map<string, Promise<void>>()
    const heartbeatAll = async (): Promise<void> => {
      await Promise.all(
        jobs.map(async (job) => {
          const state = leaseStates.get(job.id)
          if (!state || state.heartbeatRunning || state.lost || state.settled) {
            return
          }
          state.heartbeatRunning = true
          try {
            const renewed = await this.repository.heartbeat({
              jobId: job.id,
              leaseToken: job.leaseToken,
              leaseDurationMs: this.leaseDurationMs,
              now: this.now(),
            })
            if (!renewed) {
              state.lost = true
              this.recordLeaseLossSafely(job, 'heartbeat_rejected')
            }
          } catch (error) {
            state.lost = true
            this.recordLeaseLossSafely(job, 'heartbeat_failed', error)
          } finally {
            state.heartbeatRunning = false
          }
        })
      )
    }
    const heartbeatTimer = setInterval(() => {
      void heartbeatAll()
    }, this.heartbeatIntervalMs)
    heartbeatTimer.unref()

    let nextIndex = 0
    try {
      const runners = Array.from({ length: Math.min(this.concurrency, jobs.length) }, async () => {
        while (nextIndex < jobs.length) {
          const job = jobs[nextIndex]
          nextIndex += 1
          if (!job) {
            continue
          }
          const leaseState = leaseStates.get(job.id)
          if (!leaseState) {
            continue
          }
          const outcome = await this.processJob(job, leaseState, batchInvalidations)
          leaseState.settled = true
          result[outcome] += 1
        }
      })
      await Promise.all(runners)
    } finally {
      clearInterval(heartbeatTimer)
    }

    return result
  }

  private async processJob(
    job: CacheInvalidationOutboxJob,
    leaseState: CacheInvalidationLeaseState,
    batchInvalidations: Map<string, Promise<void>>
  ): Promise<'processed' | 'retried' | 'deadLettered' | 'leaseLost'> {
    try {
      const patterns = normalizeCacheInvalidationPatterns(job.patterns)
      for (const pattern of patterns) {
        if (leaseState.lost) {
          return 'leaseLost'
        }
        let invalidation = batchInvalidations.get(pattern)
        if (!invalidation) {
          invalidation = Promise.resolve().then(() => this.invalidator.deleteByPattern(pattern))
          batchInvalidations.set(pattern, invalidation)
        }
        await invalidation
      }
      if (leaseState.lost) {
        return 'leaseLost'
      }

      const acknowledged = await this.repository.acknowledge({
        jobId: job.id,
        leaseToken: job.leaseToken,
        now: this.now(),
      })
      if (!acknowledged) {
        this.recordLeaseLossSafely(job, 'acknowledge_rejected')
      }
      return acknowledged ? 'processed' : 'leaseLost'
    } catch (error) {
      if (leaseState.lost) {
        return 'leaseLost'
      }

      const failure = {
        jobId: job.id,
        leaseToken: job.leaseToken,
        errorClass: sanitizeErrorClass(error),
        errorMessage: sanitizeErrorMessage(error),
        now: this.now(),
      }

      if (
        error instanceof InvalidCacheInvalidationPayloadError ||
        job.attemptCount >= this.maxAttempts
      ) {
        const deadLettered = await this.repository.deadLetter(failure)
        if (!deadLettered) {
          this.recordLeaseLossSafely(job, 'dead_letter_rejected')
        }
        return deadLettered ? 'deadLettered' : 'leaseLost'
      }

      const retried = await this.repository.retry({
        ...failure,
        availableAt: new Date(failure.now.getTime() + this.retryDelayMs(job.attemptCount)),
      })
      if (!retried) {
        this.recordLeaseLossSafely(job, 'retry_rejected')
      }
      return retried ? 'retried' : 'leaseLost'
    }
  }

  private recordLeaseLossSafely(
    job: CacheInvalidationOutboxJob,
    stage: CacheInvalidationLeaseLossStage,
    error?: unknown
  ): void {
    try {
      this.operationalLogger.log('warn', buildCacheInvalidationLeaseLossEvent(job, stage, error))
    } catch {
      // Telemetry failure must never change fenced invalidation semantics.
    }
  }

  private retryDelayMs(attemptCount: number): number {
    const exponential = Math.min(
      this.retryCapMs,
      this.retryBaseMs * 2 ** Math.max(0, attemptCount - 1)
    )
    const boundedRandom = Math.min(1, Math.max(0, this.random()))
    const jitterFactor = 0.8 + boundedRandom * 0.4
    return Math.round(exponential * jitterFactor)
  }
}
