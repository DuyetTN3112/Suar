import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import type { NotificationFanoutRepository } from '#modules/notifications/actions/ports/outbound/notification_fanout_repository'
import type { NotificationCommandV1Input } from '#modules/notifications/domain/notification-feed/notification_command'
import type { NotificationFanoutWorkTarget } from '#modules/notifications/domain/notification-outbox/notification_fanout'
import { PostgresNotificationFanoutRepository } from '#modules/notifications/infra/repositories/notification-outbox/postgres_notification_fanout_repository'
import {
  buildPlatformTraceContext,
  createCorrelationKey,
  platformOperationalLogger,
  type PlatformEvent,
  type PlatformOperationalLogger,
} from '#modules/observability/public_contracts/platform_observability'

interface NotificationFanoutAcceptance {
  stage(
    command: NotificationCommandV1Input,
    options: { trx: TransactionClientContract; now?: Date }
  ): Promise<{ notificationId: string }>
}

interface NotificationFanoutWorkerOptions {
  repository?: NotificationFanoutRepository
  acceptance: NotificationFanoutAcceptance
  workerId: string
  now?: () => Date
  random?: () => number
  batchSize?: number
  concurrency?: number
  leaseDurationMs?: number
  maxAttempts?: number
  retryBaseMs?: number
  retryCapMs?: number
  operationalLogger?: Pick<PlatformOperationalLogger, 'log'>
}

export interface NotificationFanoutRunResult {
  claimed: number
  processed: number
  retried: number
  deadLettered: number
  leaseLost: number
  aborted?: number
}

export interface NotificationFanoutRunOptions {
  signal?: AbortSignal
}

const DEFAULTS = {
  batchSize: 100,
  concurrency: 8,
  leaseDurationMs: 30_000,
  maxAttempts: 10,
  retryBaseMs: 1_000,
  retryCapMs: 300_000,
} as const

const MAX_ERROR_MESSAGE_BYTES = 1_024

type NotificationFanoutLeaseLossStage =
  | 'lock_rejected'
  | 'mark_processed_rejected'
  | 'retry_rejected'
  | 'retry_failed'
  | 'dead_letter_rejected'
  | 'dead_letter_failed'

type NotificationFanoutTargetOutcome =
  | 'processed'
  | 'retried'
  | 'deadLettered'
  | 'leaseLost'
  | 'aborted'

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
  const raw = error instanceof Error ? error.constructor.name : 'UnknownFanoutError'
  return raw.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 200) || 'UnknownFanoutError'
}

function buildNotificationFanoutLeaseLossEvent(
  target: NotificationFanoutWorkTarget,
  stage: NotificationFanoutLeaseLossStage,
  error?: unknown
): PlatformEvent {
  const serializedError = serializeObservabilityError(error)

  return {
    event_name: 'notification.fanout.lease_lost',
    event_family: 'notification',
    module: 'notifications',
    subsystem: 'notification_fanout',
    workflow: 'notification_fanout_delivery',
    stage,
    severity: 'warn',
    outcome: 'warning',
    occurred_at: new Date().toISOString(),
    actor: {
      initiator_type: 'job',
      role_surface: 'notification_fanout_worker',
    },
    request: null,
    trace: buildPlatformTraceContext({
      workflow: 'notification_fanout_delivery',
      correlationKey: createCorrelationKey([target.id, stage]),
    }),
    target: {
      type: 'notification_fanout_target',
      id: target.id,
      scope: 'lease',
    },
    change: {
      lease_outcome: 'lost',
      mutation_stage: stage,
    },
    runtime: {
      attempt_count: target.attemptCount,
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

export class NotificationFanoutWorker {
  private readonly repository: NotificationFanoutRepository
  private readonly acceptance: NotificationFanoutAcceptance
  private readonly workerId: string
  private readonly now: () => Date
  private readonly random: () => number
  private readonly batchSize: number
  private readonly concurrency: number
  private readonly leaseDurationMs: number
  private readonly maxAttempts: number
  private readonly retryBaseMs: number
  private readonly retryCapMs: number
  private readonly operationalLogger: Pick<PlatformOperationalLogger, 'log'>

  constructor(options: NotificationFanoutWorkerOptions) {
    this.repository = options.repository ?? new PostgresNotificationFanoutRepository()
    this.acceptance = options.acceptance
    this.workerId = options.workerId
    this.now = options.now ?? (() => new Date())
    this.random = options.random ?? Math.random
    this.batchSize = options.batchSize ?? DEFAULTS.batchSize
    this.concurrency = options.concurrency ?? DEFAULTS.concurrency
    this.leaseDurationMs = options.leaseDurationMs ?? DEFAULTS.leaseDurationMs
    this.maxAttempts = options.maxAttempts ?? DEFAULTS.maxAttempts
    this.retryBaseMs = options.retryBaseMs ?? DEFAULTS.retryBaseMs
    this.retryCapMs = options.retryCapMs ?? DEFAULTS.retryCapMs
    this.operationalLogger = options.operationalLogger ?? platformOperationalLogger

    validateInteger('batchSize', this.batchSize, 1, 100)
    validateInteger('concurrency', this.concurrency, 1, 8)
    validateInteger('leaseDurationMs', this.leaseDurationMs, 1_000, 300_000)
    validateInteger('maxAttempts', this.maxAttempts, 1, 100)
    validateInteger('retryBaseMs', this.retryBaseMs, 100, 300_000)
    validateInteger('retryCapMs', this.retryCapMs, this.retryBaseMs, 3_600_000)
  }

  async runOnce(options: NotificationFanoutRunOptions = {}): Promise<NotificationFanoutRunResult> {
    if (options.signal?.aborted) {
      return {
        claimed: 0,
        processed: 0,
        retried: 0,
        deadLettered: 0,
        leaseLost: 0,
      }
    }
    const targets = await this.repository.claimBatch({
      workerId: this.workerId,
      batchSize: this.batchSize,
      leaseDurationMs: this.leaseDurationMs,
      now: this.now(),
      ...(options.signal ? { signal: options.signal } : {}),
    })
    const result: NotificationFanoutRunResult = {
      claimed: targets.length,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    }
    let nextIndex = 0
    const runners = Array.from({ length: Math.min(this.concurrency, targets.length) }, async () => {
      while (nextIndex < targets.length) {
        const target = targets[nextIndex]
        nextIndex += 1
        if (!target) {
          continue
        }
        const outcome = await this.processTarget(target, options.signal)
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

  private async processTarget(
    target: NotificationFanoutWorkTarget,
    shutdownSignal?: AbortSignal
  ): Promise<NotificationFanoutTargetOutcome> {
    if (shutdownSignal?.aborted) {
      return 'aborted'
    }
    const processingNow = this.now()
    try {
      const processed = await db.transaction(async (trx) => {
        throwIfFanoutShutdownRequested(shutdownSignal)
        const locked = await this.repository.lockForProcessing(
          {
            targetId: target.id,
            leaseToken: target.leaseToken,
            now: processingNow,
          },
          trx
        )
        if (!locked) {
          return false
        }

        throwIfFanoutShutdownRequested(shutdownSignal)
        const accepted = await this.acceptance.stage(locked.command, {
          trx,
          // The source transaction already validated the online age horizon before
          // persisting this durable work. A delayed internal replay must remain valid.
          now: new Date(locked.command.occurredAt),
        })
        throwIfFanoutShutdownRequested(shutdownSignal)
        const acknowledged = await this.repository.markProcessed(
          {
            targetId: locked.id,
            leaseToken: locked.leaseToken,
            notificationId: accepted.notificationId,
            now: processingNow,
          },
          trx
        )
        if (!acknowledged) {
          throw new NotificationFanoutLeaseLostError()
        }
        throwIfFanoutShutdownRequested(shutdownSignal)
        return true
      })
      if (!processed) {
        this.recordLeaseLossSafely(target, 'lock_rejected')
      }
      return processed ? 'processed' : 'leaseLost'
    } catch (error) {
      if (error instanceof NotificationFanoutWorkerShutdownError || shutdownSignal?.aborted) {
        return 'aborted'
      }
      if (error instanceof NotificationFanoutLeaseLostError) {
        this.recordLeaseLossSafely(target, error.stage)
        return 'leaseLost'
      }
      const failedAt = this.now()
      const failure = {
        targetId: target.id,
        leaseToken: target.leaseToken,
        errorClass: sanitizeErrorClass(error),
        errorMessage: sanitizeErrorMessage(error),
        now: failedAt,
        ...(shutdownSignal ? { signal: shutdownSignal } : {}),
      }
      if (target.attemptCount >= this.maxAttempts) {
        if (shutdownSignal?.aborted) {
          return 'aborted'
        }
        let deadLettered = false
        try {
          deadLettered = await this.repository.deadLetter(failure)
        } catch (persistenceError) {
          if (shutdownSignal?.aborted) {
            return 'aborted'
          }
          this.recordLeaseLossSafely(target, 'dead_letter_failed', persistenceError)
          return 'leaseLost'
        }
        if (!deadLettered) {
          this.recordLeaseLossSafely(target, 'dead_letter_rejected')
        }
        return deadLettered ? 'deadLettered' : 'leaseLost'
      }
      if (shutdownSignal?.aborted) {
        return 'aborted'
      }
      let retried = false
      try {
        retried = await this.repository.retry({
          ...failure,
          availableAt: new Date(failedAt.getTime() + this.retryDelayMs(target.attemptCount)),
        })
      } catch (persistenceError) {
        if (shutdownSignal?.aborted) {
          return 'aborted'
        }
        this.recordLeaseLossSafely(target, 'retry_failed', persistenceError)
        return 'leaseLost'
      }
      if (!retried) {
        this.recordLeaseLossSafely(target, 'retry_rejected')
      }
      return retried ? 'retried' : 'leaseLost'
    }
  }

  private recordLeaseLossSafely(
    target: NotificationFanoutWorkTarget,
    stage: NotificationFanoutLeaseLossStage,
    error?: unknown
  ): void {
    try {
      this.operationalLogger.log(
        'warn',
        buildNotificationFanoutLeaseLossEvent(target, stage, error)
      )
    } catch {
      // Telemetry failure must never change fenced fanout-delivery semantics.
    }
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

class NotificationFanoutLeaseLostError extends Error {
  readonly stage = 'mark_processed_rejected' as const

  constructor() {
    super('notification_fanout_lease_lost')
    this.name = 'NotificationFanoutLeaseLostError'
  }
}

class NotificationFanoutWorkerShutdownError extends Error {
  constructor() {
    super('notification_fanout_worker_shutdown')
    this.name = 'NotificationFanoutWorkerShutdownError'
  }
}

function throwIfFanoutShutdownRequested(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new NotificationFanoutWorkerShutdownError()
  }
}
