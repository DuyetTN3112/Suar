import type {
  DomainEventOutboxRepository,
  DurableDomainEventDispatcher,
  DurableDomainEventJob,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox'
import {
  parseDurableDomainEventPayload,
  validateDurableDomainEventEnvelope,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox'
import { PostgresDomainEventOutboxRepository } from '#modules/events/infra/repositories/domain-event-outbox-administration/postgres_domain_event_outbox_repository'
import { DomainEventDeliveryError } from '#modules/events/public_contracts/domain_event_delivery_error'

export interface DomainEventOutboxWorkerOptions {
  workerId: string
  dispatcher: DurableDomainEventDispatcher
  repository?: DomainEventOutboxRepository
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
}

export interface DomainEventOutboxRunResult {
  claimed: number
  processed: number
  retried: number
  deadLettered: number
  leaseLost: number
  aborted?: number
}

export interface DomainEventOutboxRunOptions {
  signal?: AbortSignal
}

type JobOutcome = 'processed' | 'retried' | 'deadLettered' | 'leaseLost' | 'aborted'

const DEFAULTS = {
  batchSize: 50,
  concurrency: 4,
  leaseDurationMs: 180_000,
  heartbeatIntervalMs: 10_000,
  handlerDeadlineMs: 120_000,
  maxAttempts: 10,
  retryBaseMs: 1_000,
  retryCapMs: 300_000,
} as const

function validateInteger(name: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be between ${minimum} and ${maximum}`)
  }
}

function deliveryErrorCode(error: unknown): string {
  const candidate =
    error instanceof DomainEventDeliveryError
      ? error.errorCode
      : typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          typeof error.code === 'string'
        ? error.code
        : 'UNEXPECTED_EVENT_DELIVERY_ERROR'
  return candidate.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 128) || 'UNKNOWN_DELIVERY_ERROR'
}

export class DomainEventOutboxWorker {
  private readonly repository: DomainEventOutboxRepository
  private readonly dispatcher: DurableDomainEventDispatcher
  private readonly workerId: string
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

  constructor(options: DomainEventOutboxWorkerOptions) {
    this.repository = options.repository ?? new PostgresDomainEventOutboxRepository()
    this.dispatcher = options.dispatcher
    this.workerId = options.workerId
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

    if (this.workerId.trim().length < 1 || this.workerId.length > 200) {
      throw new RangeError('workerId must contain 1 to 200 characters')
    }
    validateInteger('batchSize', this.batchSize, 1, 100)
    validateInteger('concurrency', this.concurrency, 1, 8)
    validateInteger('leaseDurationMs', this.leaseDurationMs, 1_000, 300_000)
    validateInteger('heartbeatIntervalMs', this.heartbeatIntervalMs, 100, this.leaseDurationMs - 1)
    validateInteger('handlerDeadlineMs', this.handlerDeadlineMs, 100, this.leaseDurationMs - 1)
    validateInteger('maxAttempts', this.maxAttempts, 1, 100)
    validateInteger('retryBaseMs', this.retryBaseMs, 100, 300_000)
    validateInteger('retryCapMs', this.retryCapMs, this.retryBaseMs, 3_600_000)
  }

  async runOnce(options: DomainEventOutboxRunOptions = {}): Promise<DomainEventOutboxRunResult> {
    if (options.signal?.aborted) {
      return {
        claimed: 0,
        processed: 0,
        retried: 0,
        deadLettered: 0,
        leaseLost: 0,
      }
    }
    const jobs = await this.repository.claimBatch({
      workerId: this.workerId,
      batchSize: this.batchSize,
      leaseDurationMs: this.leaseDurationMs,
      now: this.now(),
    })
    const result: DomainEventOutboxRunResult = {
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
        if (!job) continue
        const outcome = await this.processJob(job, options.signal)
        if (outcome === 'aborted') {
          result.aborted = (result.aborted ?? 0) + 1
        } else {
          result[outcome] += 1
        }
      }
    })
    await Promise.all(runners)
    return result
  }

  private async processJob(
    job: DurableDomainEventJob,
    shutdownSignal?: AbortSignal
  ): Promise<JobOutcome> {
    if (shutdownSignal?.aborted) {
      return 'aborted'
    }
    const abortController = new AbortController()
    const leaseState = { lost: false }
    const shutdownState = { aborted: false }
    let rejectLeaseLoss: ((error: DomainEventDeliveryError) => void) | undefined
    const leaseLoss = new Promise<never>((_resolve, reject) => {
      rejectLeaseLoss = reject
    })
    let resolveShutdown: (() => void) | undefined
    const shutdown = new Promise<void>((resolve) => {
      resolveShutdown = resolve
    })
    let heartbeatCompletion: Promise<void> | undefined

    const markLeaseLost = (errorCode: string): void => {
      if (leaseState.lost) {
        return
      }
      leaseState.lost = true
      const error = new DomainEventDeliveryError(errorCode, true)
      abortController.abort(error)
      rejectLeaseLoss?.(error)
    }

    const markShutdown = (): void => {
      if (shutdownState.aborted) {
        return
      }
      shutdownState.aborted = true
      abortController.abort(
        new DomainEventDeliveryError('DOMAIN_EVENT_WORKER_SHUTDOWN', true)
      )
      resolveShutdown?.()
    }
    shutdownSignal?.addEventListener('abort', markShutdown, { once: true })

    const heartbeat = (): Promise<void> => {
      if (heartbeatCompletion || abortController.signal.aborted) {
        return heartbeatCompletion ?? Promise.resolve()
      }
      heartbeatCompletion = (async () => {
        try {
          const renewed = await this.repository.heartbeat({
            jobId: job.id,
            leaseToken: job.leaseToken,
            leaseDurationMs: this.leaseDurationMs,
            now: this.now(),
          })
          if (!renewed) {
            markLeaseLost('DOMAIN_EVENT_HEARTBEAT_REJECTED')
          }
        } catch {
          markLeaseLost('DOMAIN_EVENT_HEARTBEAT_FAILED')
        }
      })().finally(() => {
        heartbeatCompletion = undefined
      })
      return heartbeatCompletion
    }

    const heartbeatTimer = setInterval(() => {
      void heartbeat()
    }, this.heartbeatIntervalMs)
    heartbeatTimer.unref()
    let rejectDeadline: ((error: DomainEventDeliveryError) => void) | undefined
    const deadline = new Promise<never>((_resolve, reject) => {
      rejectDeadline = reject
    })
    const deadlineTimer = setTimeout(() => {
      const error = new DomainEventDeliveryError('DOMAIN_EVENT_HANDLER_DEADLINE', true)
      abortController.abort(error)
      rejectDeadline?.(error)
    }, this.handlerDeadlineMs)
    deadlineTimer.unref()

    let deliveryError: unknown
    try {
      let payload
      try {
        payload = parseDurableDomainEventPayload(job.eventName, job.payload)
      } catch (error) {
        throw new DomainEventDeliveryError('INVALID_DOMAIN_EVENT_PAYLOAD', false, { cause: error })
      }
      try {
        validateDurableDomainEventEnvelope(job, payload)
      } catch (error) {
        throw new DomainEventDeliveryError('INVALID_DOMAIN_EVENT_ENVELOPE', false, {
          cause: error,
        })
      }
      const deliveryOutcome = await Promise.race([
        this.dispatcher
          .dispatch(job.eventName, payload, {
            signal: abortController.signal,
            sequence: job.sequence,
          })
          .then(() => 'delivered' as const),
        leaseLoss,
        deadline,
        shutdown.then(() => 'aborted' as const),
      ])
      if (deliveryOutcome === 'aborted') {
        deliveryError = new DomainEventDeliveryError('DOMAIN_EVENT_WORKER_SHUTDOWN', true)
      }
    } catch (error) {
      deliveryError = error
    } finally {
      clearInterval(heartbeatTimer)
      clearTimeout(deadlineTimer)
      shutdownSignal?.removeEventListener('abort', markShutdown)
      if (heartbeatCompletion) {
        await heartbeatCompletion
      }
    }

    if (leaseState.lost) {
      return 'leaseLost'
    }
    if (shutdownState.aborted || shutdownSignal?.aborted) {
      return 'aborted'
    }

    if (deliveryError === undefined) {
      let acknowledged = false
      try {
        acknowledged = await this.repository.acknowledge({
          jobId: job.id,
          leaseToken: job.leaseToken,
          now: this.now(),
          ...(job.eventName === 'auth:session:observed:v1'
            ? { redactPayload: true }
            : {}),
        })
      } catch {
        return 'leaseLost'
      }
      return acknowledged ? 'processed' : 'leaseLost'
    }

    const now = this.now()
    const errorCode = deliveryErrorCode(deliveryError)
    const permanent = deliveryError instanceof DomainEventDeliveryError && !deliveryError.retryable
    if (permanent || job.attemptCount >= this.maxAttempts) {
      let deadLettered = false
      try {
        deadLettered = await this.repository.deadLetter({
          jobId: job.id,
          leaseToken: job.leaseToken,
          errorCode,
          now,
        })
      } catch {
        return 'leaseLost'
      }
      return deadLettered ? 'deadLettered' : 'leaseLost'
    }

    let retried = false
    try {
      retried = await this.repository.retry({
        jobId: job.id,
        leaseToken: job.leaseToken,
        errorCode,
        now,
        availableAt: new Date(now.getTime() + this.retryDelayMs(job.attemptCount)),
      })
    } catch {
      return 'leaseLost'
    }
    return retried ? 'retried' : 'leaseLost'
  }

  private retryDelayMs(attemptCount: number): number {
    const exponential = Math.min(
      this.retryCapMs,
      this.retryBaseMs * 2 ** Math.max(0, attemptCount - 1)
    )
    const boundedRandom = Math.min(1, Math.max(0, this.random()))
    return Math.round(exponential * (0.8 + boundedRandom * 0.4))
  }
}
