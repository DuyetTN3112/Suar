import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import type {
  NotificationOutboxDestination,
  NotificationOutboxHandler,
  NotificationOutboxJob,
  NotificationOutboxRepository,
} from '#modules/notifications/domain/notification_outbox'
import {
  NotificationDeliveryError,
  NotificationTransientDeliveryError,
} from '#modules/notifications/domain/notification_outbox_errors'
import { PostgresNotificationOutboxRepository } from '#modules/notifications/infra/repositories/postgres_notification_outbox_repository'
import {
  buildPlatformTraceContext,
  createCorrelationKey,
  platformOperationalLogger,
  type PlatformEvent,
  type PlatformOperationalLogger,
} from '#modules/observability/public_contracts/platform_observability'

interface NotificationOutboxWorkerOptions {
  repository?: NotificationOutboxRepository
  workerId: string
  handlers: Record<NotificationOutboxDestination, NotificationOutboxHandler>
  now?: () => Date
  random?: () => number
  batchSize?: number
  concurrency?: number
  leaseDurationMs?: number
  heartbeatIntervalMs?: number
  handlerDeadlineMs?: number
  maxAttempts?: number
  retryBaseMs?: number
  retryCapMs?: number
  destination?: NotificationOutboxDestination
  operationalLogger?: Pick<PlatformOperationalLogger, 'log'>
}

export interface NotificationOutboxRunResult {
  claimed: number
  processed: number
  retried: number
  deadLettered: number
  leaseLost: number
}

const DEFAULTS = {
  batchSize: 100,
  concurrency: 8,
  leaseDurationMs: 30_000,
  heartbeatIntervalMs: 10_000,
  handlerDeadlineMs: 25_000,
  maxAttempts: 10,
  retryBaseMs: 1_000,
  retryCapMs: 300_000,
} as const

const MAX_ERROR_MESSAGE_BYTES = 1_024

type NotificationOutboxLeaseLossStage =
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
  const raw = error instanceof Error ? error.constructor.name : 'UnknownDeliveryError'
  return raw.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 200) || 'UnknownDeliveryError'
}

function buildNotificationOutboxLeaseLossEvent(
  job: NotificationOutboxJob,
  stage: NotificationOutboxLeaseLossStage,
  error?: unknown
): PlatformEvent {
  const serializedError = serializeObservabilityError(error)

  return {
    event_name: 'notification.outbox.lease_lost',
    event_family: 'notification',
    module: 'notifications',
    subsystem: 'notification_outbox',
    workflow: 'notification_projection_delivery',
    stage,
    severity: 'warn',
    outcome: 'warning',
    occurred_at: new Date().toISOString(),
    actor: {
      initiator_type: 'job',
      role_surface: 'notification_outbox_worker',
    },
    request: null,
    trace: buildPlatformTraceContext({
      workflow: 'notification_projection_delivery',
      correlationKey: createCorrelationKey([job.id, stage]),
    }),
    target: {
      type: 'notification_outbox_job',
      id: job.id,
      scope: job.destination,
    },
    change: {
      lease_outcome: 'lost',
      mutation_stage: stage,
    },
    runtime: {
      destination: job.destination,
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

export class NotificationOutboxWorker {
  private readonly repository: NotificationOutboxRepository
  private readonly workerId: string
  private readonly handlers: Record<NotificationOutboxDestination, NotificationOutboxHandler>
  private readonly now: () => Date
  private readonly random: () => number
  private readonly batchSize: number
  private readonly concurrency: number
  private readonly leaseDurationMs: number
  private readonly heartbeatIntervalMs: number
  private readonly handlerDeadlineMs: number
  private readonly maxAttempts: number
  private readonly retryBaseMs: number
  private readonly retryCapMs: number
  private readonly destination: NotificationOutboxDestination | undefined
  private readonly operationalLogger: Pick<PlatformOperationalLogger, 'log'>

  constructor(options: NotificationOutboxWorkerOptions) {
    this.repository = options.repository ?? new PostgresNotificationOutboxRepository()
    this.workerId = options.workerId
    this.handlers = options.handlers
    this.now = options.now ?? (() => new Date())
    this.random = options.random ?? Math.random
    this.batchSize = options.batchSize ?? DEFAULTS.batchSize
    this.concurrency = options.concurrency ?? DEFAULTS.concurrency
    this.leaseDurationMs = options.leaseDurationMs ?? DEFAULTS.leaseDurationMs
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? DEFAULTS.heartbeatIntervalMs
    this.handlerDeadlineMs = options.handlerDeadlineMs ?? DEFAULTS.handlerDeadlineMs
    this.maxAttempts = options.maxAttempts ?? DEFAULTS.maxAttempts
    this.retryBaseMs = options.retryBaseMs ?? DEFAULTS.retryBaseMs
    this.retryCapMs = options.retryCapMs ?? DEFAULTS.retryCapMs
    this.destination = options.destination
    this.operationalLogger = options.operationalLogger ?? platformOperationalLogger

    validateInteger('batchSize', this.batchSize, 1, 100)
    validateInteger('concurrency', this.concurrency, 1, 8)
    validateInteger('leaseDurationMs', this.leaseDurationMs, 1_000, 300_000)
    validateInteger('heartbeatIntervalMs', this.heartbeatIntervalMs, 100, this.leaseDurationMs - 1)
    validateInteger('handlerDeadlineMs', this.handlerDeadlineMs, 100, this.leaseDurationMs - 1)
    validateInteger('maxAttempts', this.maxAttempts, 1, 100)
    validateInteger('retryBaseMs', this.retryBaseMs, 100, 300_000)
    validateInteger('retryCapMs', this.retryCapMs, this.retryBaseMs, 3_600_000)
  }

  async runOnce(): Promise<NotificationOutboxRunResult> {
    const jobs = await this.repository.claimBatch({
      workerId: this.workerId,
      batchSize: this.batchSize,
      leaseDurationMs: this.leaseDurationMs,
      now: this.now(),
      ...(this.destination !== undefined ? { destination: this.destination } : {}),
    })
    const result: NotificationOutboxRunResult = {
      claimed: jobs.length,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    }

    let nextIndex = 0
    const runners = Array.from({ length: Math.min(this.concurrency, jobs.length) }, async () => {
      while (nextIndex < jobs.length) {
        const job = jobs[nextIndex]
        nextIndex += 1
        if (!job) {
          continue
        }
        const outcome = await this.processJob(job)
        result[outcome] += 1
      }
    })
    await Promise.all(runners)

    return result
  }

  private async processJob(
    job: NotificationOutboxJob
  ): Promise<'processed' | 'retried' | 'deadLettered' | 'leaseLost'> {
    const abortController = new AbortController()
    let heartbeatRunning = false
    const leaseState = { lost: false }
    let rejectLeaseLoss: ((error: Error) => void) | undefined
    const leaseLoss = new Promise<never>((_resolve, reject) => {
      rejectLeaseLoss = reject
    })

    const heartbeat = async () => {
      if (heartbeatRunning || abortController.signal.aborted) {
        return
      }
      heartbeatRunning = true
      try {
        const renewed = await this.repository.heartbeat({
          jobId: job.id,
          leaseToken: job.leaseToken,
          leaseDurationMs: this.leaseDurationMs,
          now: this.now(),
        })
        if (!renewed) {
          leaseState.lost = true
          this.recordLeaseLossSafely(job, 'heartbeat_rejected')
          rejectLeaseLoss?.(new Error('notification_outbox_lease_lost'))
          abortController.abort()
        }
      } catch (error) {
        leaseState.lost = true
        this.recordLeaseLossSafely(job, 'heartbeat_failed', error)
        rejectLeaseLoss?.(new Error('notification_outbox_heartbeat_failed'))
        abortController.abort()
      } finally {
        heartbeatRunning = false
      }
    }

    const heartbeatTimer = setInterval(() => {
      void heartbeat()
    }, this.heartbeatIntervalMs)
    heartbeatTimer.unref()

    const deadlineTimer = setTimeout(() => {
      abortController.abort()
      rejectLeaseLoss?.(new NotificationTransientDeliveryError('notification_handler_deadline'))
    }, this.handlerDeadlineMs)
    deadlineTimer.unref()

    try {
      const handler = this.handlers[job.destination]
      await Promise.race([handler(job, { signal: abortController.signal }), leaseLoss])
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
      const permanent = error instanceof NotificationDeliveryError ? !error.retryable : false

      if (permanent || job.attemptCount >= this.maxAttempts) {
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
    } finally {
      clearInterval(heartbeatTimer)
      clearTimeout(deadlineTimer)
    }
  }

  private recordLeaseLossSafely(
    job: NotificationOutboxJob,
    stage: NotificationOutboxLeaseLossStage,
    error?: unknown
  ): void {
    try {
      this.operationalLogger.log('warn', buildNotificationOutboxLeaseLossEvent(job, stage, error))
    } catch {
      // Telemetry failure must never change fenced durable-delivery semantics.
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
