import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import { errorReportingConfig } from '#config/error_reporting'
import { toErrorEventUuidOrNull } from '#modules/errors/domain/error-event-retention/error_event_identifier'
import {
  sanitizeErrorDetails,
  sanitizeErrorLogText,
  sanitizeErrorText,
  sanitizeRequestUrl,
} from '#modules/errors/public_contracts/error_sanitization'
import loggerService from '#modules/logger/public_contracts/application_logger'

type ErrorEventSeverity = 'error' | 'warning'

export interface CreateErrorEventPayload {
  code: string
  status: number
  severity: ErrorEventSeverity
  message: string
  safe_message: string | null
  details: Record<string, unknown> | null
  request_id: string | null
  correlation_id: string | null
  actor_user_id: string | null
  actor_org_id: string | null
  method: string | null
  url: string | null
  ip_address: string | null
  user_agent: string | null
}

const MAX_DETAILS_BYTES = 65_536
const DROP_NOTICE_INTERVAL_MS = 30_000

type ErrorEventWriter = (payload: CreateErrorEventPayload) => Promise<void>

export type ErrorEventEnqueueResult =
  | 'accepted'
  | 'capacity_exhausted'
  | 'circuit_open'
  | 'shutting_down'
export type ErrorEventDrainResult = 'drained' | 'timed_out'

interface BoundedErrorEventReporterOptions {
  maxInFlight: number
  circuitOpenMs: number
  now?: () => number
  onWriteFailure?: (error: unknown) => void
  onDrop?: (reason: Exclude<ErrorEventEnqueueResult, 'accepted'>) => void
}

/**
 * Bounds the error-event side effect so telemetry cannot delay an HTTP response
 * or create an unbounded queue during a database outage.
 */
export class BoundedErrorEventReporter {
  private inFlight = 0
  private accepting = true
  private circuitOpenUntil = 0
  private lastDropNoticeAt = Number.NEGATIVE_INFINITY
  private readonly drainWaiters = new Set<() => void>()
  private readonly now: () => number

  constructor(
    private readonly writer: ErrorEventWriter,
    private readonly options: BoundedErrorEventReporterOptions
  ) {
    if (!Number.isSafeInteger(options.maxInFlight) || options.maxInFlight < 1) {
      throw new RangeError('maxInFlight must be a positive integer')
    }
    if (!Number.isSafeInteger(options.circuitOpenMs) || options.circuitOpenMs < 1) {
      throw new RangeError('circuitOpenMs must be a positive integer')
    }
    this.now = options.now ?? Date.now
  }

  enqueue(payload: CreateErrorEventPayload): ErrorEventEnqueueResult {
    const now = this.now()
    if (!this.accepting) {
      this.noticeDrop('shutting_down', now)
      return 'shutting_down'
    }
    if (now < this.circuitOpenUntil) {
      this.noticeDrop('circuit_open', now)
      return 'circuit_open'
    }
    if (this.inFlight >= this.options.maxInFlight) {
      this.noticeDrop('capacity_exhausted', now)
      return 'capacity_exhausted'
    }

    this.inFlight += 1
    void Promise.resolve()
      .then(() => this.writer(payload))
      .then(() => {
        if (this.now() >= this.circuitOpenUntil) {
          this.circuitOpenUntil = 0
        }
      })
      .catch((error: unknown) => {
        this.circuitOpenUntil = Math.max(
          this.circuitOpenUntil,
          this.now() + this.options.circuitOpenMs
        )
        this.options.onWriteFailure?.(error)
      })
      .finally(() => {
        this.inFlight -= 1
        if (this.inFlight === 0) {
          for (const resolve of this.drainWaiters) {
            resolve()
          }
          this.drainWaiters.clear()
        }
      })

    return 'accepted'
  }

  /**
   * Stops admission and waits for accepted writes within a strict lifecycle
   * budget. A timeout does not cancel a driver call; the database query itself
   * remains independently bounded by ERROR_EVENT_INSERT_TIMEOUT_MS.
   */
  async closeAndDrain(timeoutMs: number): Promise<ErrorEventDrainResult> {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
      throw new RangeError('Error-event drain timeout must be a positive integer')
    }

    this.accepting = false
    if (this.inFlight === 0) {
      return 'drained'
    }

    let resolveDrained!: () => void
    const drained = new Promise<void>((resolve) => {
      resolveDrained = resolve
      this.drainWaiters.add(resolve)
    })
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const timedOut = new Promise<ErrorEventDrainResult>((resolve) => {
      timeoutHandle = setTimeout(() => resolve('timed_out'), timeoutMs)
    })

    const result = await Promise.race<ErrorEventDrainResult>([
      drained.then(() => 'drained'),
      timedOut,
    ])
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle)
    }
    this.drainWaiters.delete(resolveDrained)
    return result
  }

  private noticeDrop(reason: Exclude<ErrorEventEnqueueResult, 'accepted'>, now: number): void {
    if (now - this.lastDropNoticeAt < DROP_NOTICE_INTERVAL_MS) {
      return
    }
    this.lastDropNoticeAt = now
    this.options.onDrop?.(reason)
  }
}

function boundedNullableText(value: string | null, maxLength: number): string | null {
  return value === null ? null : sanitizeErrorText(value, maxLength)
}

function boundedDetails(value: Record<string, unknown> | null): Record<string, unknown> | null {
  if (value === null) {
    return null
  }
  const sanitized = sanitizeErrorDetails(value)
  if (
    sanitized !== null &&
    Buffer.byteLength(JSON.stringify(sanitized), 'utf8') <= MAX_DETAILS_BYTES
  ) {
    return sanitized
  }
  return {
    diagnostic: '[TRUNCATED_OVERSIZED_DETAILS]',
  }
}

export async function createErrorEvent(payload: CreateErrorEventPayload): Promise<void> {
  if (!Number.isInteger(payload.status) || payload.status < 400 || payload.status > 599) {
    throw new RangeError('Error-event status must be an integer between 400 and 599')
  }

  await db
    .table('error_events')
    .insert({
      id: randomUUID(),
      code: sanitizeErrorText(payload.code, 120),
      status: payload.status,
      severity: payload.severity,
      message: sanitizeErrorText(payload.message, 2_048),
      safe_message: boundedNullableText(payload.safe_message, 1_024),
      details: boundedDetails(payload.details),
      request_id: toErrorEventUuidOrNull(payload.request_id),
      correlation_id: boundedNullableText(payload.correlation_id, 128),
      actor_user_id: toErrorEventUuidOrNull(payload.actor_user_id),
      actor_org_id: toErrorEventUuidOrNull(payload.actor_org_id),
      method: boundedNullableText(payload.method, 16),
      url: sanitizeRequestUrl(payload.url),
      ip_address: boundedNullableText(payload.ip_address, 64),
      user_agent: boundedNullableText(payload.user_agent, 512),
      created_at: new Date(),
    })
    .timeout(errorReportingConfig.insertTimeoutMs, { cancel: true })
}

function createDefaultErrorEventReporter(): BoundedErrorEventReporter {
  return new BoundedErrorEventReporter(createErrorEvent, {
    maxInFlight: errorReportingConfig.maxInFlight,
    circuitOpenMs: errorReportingConfig.circuitOpenMs,
    onWriteFailure(error) {
      loggerService.warn('[ErrorEventReporter] Persistence circuit opened', {
        error: sanitizeErrorLogText(
          error instanceof Error ? error.message : 'Unknown persistence failure'
        ),
        circuitOpenMs: errorReportingConfig.circuitOpenMs,
      })
    },
    onDrop(reason) {
      loggerService.warn('[ErrorEventReporter] Event dropped safely', {
        reason,
      })
    },
  })
}

let errorEventReporter = createDefaultErrorEventReporter()

/**
 * Creates a fresh reporter for each Adonis application lifecycle. This matters
 * for integration runners that boot and terminate more than one application in
 * a single Node.js process: a reporter closed by the previous lifecycle must
 * never remain permanently closed for the next application.
 */
export function startErrorEventReporting(): void {
  errorEventReporter = createDefaultErrorEventReporter()
}

export function enqueueErrorEvent(payload: CreateErrorEventPayload): ErrorEventEnqueueResult {
  return errorEventReporter.enqueue(payload)
}

export function closeAndDrainErrorEvents(): Promise<ErrorEventDrainResult> {
  return errorEventReporter.closeAndDrain(errorReportingConfig.shutdownDrainMs)
}
