import env from '#start/env'

export interface DomainEventOutboxWorkerConfig {
  batchSize: number
  concurrency: number
  leaseDurationMs: number
  heartbeatIntervalMs: number
  handlerDeadlineMs: number
  maxAttempts: number
  retryBaseMs: number
  retryCapMs: number
  pollMs: number
}

function assertInteger(name: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`)
  }
}

export function validateDomainEventOutboxWorkerConfig(
  input: DomainEventOutboxWorkerConfig
): Readonly<DomainEventOutboxWorkerConfig> {
  assertInteger('DOMAIN_EVENT_OUTBOX_BATCH_SIZE', input.batchSize, 1, 100)
  assertInteger('DOMAIN_EVENT_OUTBOX_CONCURRENCY', input.concurrency, 1, 8)
  assertInteger('DOMAIN_EVENT_OUTBOX_LEASE_MS', input.leaseDurationMs, 1_000, 300_000)
  assertInteger(
    'DOMAIN_EVENT_OUTBOX_HEARTBEAT_MS',
    input.heartbeatIntervalMs,
    100,
    input.leaseDurationMs - 1
  )
  assertInteger(
    'DOMAIN_EVENT_OUTBOX_HANDLER_DEADLINE_MS',
    input.handlerDeadlineMs,
    100,
    input.leaseDurationMs - 1
  )
  assertInteger('DOMAIN_EVENT_OUTBOX_MAX_ATTEMPTS', input.maxAttempts, 1, 100)
  assertInteger('DOMAIN_EVENT_OUTBOX_RETRY_BASE_MS', input.retryBaseMs, 100, 300_000)
  assertInteger(
    'DOMAIN_EVENT_OUTBOX_RETRY_CAP_MS',
    input.retryCapMs,
    input.retryBaseMs,
    3_600_000
  )
  assertInteger('DOMAIN_EVENT_OUTBOX_POLL_MS', input.pollMs, 100, 60_000)
  return Object.freeze({ ...input })
}

const domainEventOutboxConfig = validateDomainEventOutboxWorkerConfig({
  batchSize: env.get('DOMAIN_EVENT_OUTBOX_BATCH_SIZE', 50),
  concurrency: env.get('DOMAIN_EVENT_OUTBOX_CONCURRENCY', 4),
  leaseDurationMs: env.get('DOMAIN_EVENT_OUTBOX_LEASE_MS', 180_000),
  heartbeatIntervalMs: env.get('DOMAIN_EVENT_OUTBOX_HEARTBEAT_MS', 10_000),
  handlerDeadlineMs: env.get('DOMAIN_EVENT_OUTBOX_HANDLER_DEADLINE_MS', 120_000),
  maxAttempts: env.get('DOMAIN_EVENT_OUTBOX_MAX_ATTEMPTS', 10),
  retryBaseMs: env.get('DOMAIN_EVENT_OUTBOX_RETRY_BASE_MS', 1_000),
  retryCapMs: env.get('DOMAIN_EVENT_OUTBOX_RETRY_CAP_MS', 300_000),
  pollMs: env.get('DOMAIN_EVENT_OUTBOX_POLL_MS', 1_000),
})

export default domainEventOutboxConfig
