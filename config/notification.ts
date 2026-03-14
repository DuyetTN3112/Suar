import env from '#start/env'

function parseCursorVerificationSecrets(value: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new TypeError('expected a JSON object')
    }
    const entries = Object.entries(parsed as Record<string, unknown>)
    if (entries.length > 10 || entries.some(([, secret]) => typeof secret !== 'string')) {
      throw new TypeError('expected at most 10 string secrets')
    }
    return Object.fromEntries(entries) as Record<string, string>
  } catch (error) {
    throw new RangeError(
      `NOTIFICATION_FEED_CURSOR_PREVIOUS_KEYS must be a bounded JSON object: ${
        error instanceof Error ? error.message : 'invalid value'
      }`
    )
  }
}

const notificationOutboxConfig = {
  batchSize: env.get('NOTIFICATION_OUTBOX_BATCH_SIZE', 100),
  concurrency: env.get('NOTIFICATION_OUTBOX_CONCURRENCY', 8),
  leaseDurationMs: env.get('NOTIFICATION_OUTBOX_LEASE_MS', 30_000),
  heartbeatIntervalMs: env.get('NOTIFICATION_OUTBOX_HEARTBEAT_MS', 10_000),
  handlerDeadlineMs: env.get('NOTIFICATION_OUTBOX_HANDLER_DEADLINE_MS', 25_000),
  maxAttempts: env.get('NOTIFICATION_OUTBOX_MAX_ATTEMPTS', 10),
  retryBaseMs: env.get('NOTIFICATION_OUTBOX_RETRY_BASE_MS', 1_000),
  retryCapMs: env.get('NOTIFICATION_OUTBOX_RETRY_CAP_MS', 300_000),
  pollMs: env.get('NOTIFICATION_OUTBOX_POLL_MS', 1_000),
  fanoutMaxTargets: env.get('NOTIFICATION_FANOUT_MAX_TARGETS', 10_000),
  fanoutBatchSize: env.get('NOTIFICATION_FANOUT_BATCH_SIZE', 100),
  fanoutConcurrency: env.get('NOTIFICATION_FANOUT_CONCURRENCY', 8),
  fanoutLeaseDurationMs: env.get('NOTIFICATION_FANOUT_LEASE_MS', 30_000),
  fanoutMaxAttempts: env.get('NOTIFICATION_FANOUT_MAX_ATTEMPTS', 10),
  fanoutRetryBaseMs: env.get('NOTIFICATION_FANOUT_RETRY_BASE_MS', 1_000),
  fanoutRetryCapMs: env.get('NOTIFICATION_FANOUT_RETRY_CAP_MS', 300_000),
  fanoutPollMs: env.get('NOTIFICATION_FANOUT_POLL_MS', 1_000),
  pipelineWarnAgeSeconds: env.get('NOTIFICATION_PIPELINE_WARN_AGE_SECONDS', 30),
  pipelineFailAgeSeconds: env.get('NOTIFICATION_PIPELINE_FAIL_AGE_SECONDS', 300),
  pipelineWarnPending: env.get('NOTIFICATION_PIPELINE_WARN_PENDING', 10_000),
  pipelineFailPending: env.get('NOTIFICATION_PIPELINE_FAIL_PENDING', 100_000),
  feedReadMode: env.get('NOTIFICATION_FEED_READ_MODE', 'postgres'),
  feedFallbackEnabled: env.get('NOTIFICATION_FEED_FALLBACK_ENABLED', true),
  feedFallbackMaxConcurrent: env.get('NOTIFICATION_FEED_FALLBACK_MAX_CONCURRENT', 32),
  feedFallbackGlobalMaxConcurrent: env.get(
    'NOTIFICATION_FEED_FALLBACK_GLOBAL_MAX_CONCURRENT',
    64
  ),
  feedFallbackAdmissionLeaseMs: env.get('NOTIFICATION_FEED_FALLBACK_ADMISSION_LEASE_MS', 10_000),
  feedCursorSecret: env.get('NOTIFICATION_FEED_CURSOR_SECRET', env.get('APP_KEY')),
  feedCursorKeyId: env.get('NOTIFICATION_FEED_CURSOR_KEY_ID', 'primary'),
  feedCursorVerificationSecrets: parseCursorVerificationSecrets(
    env.get('NOTIFICATION_FEED_CURSOR_PREVIOUS_KEYS', '{}')
  ),
  feedCursorTtlMs: env.get('NOTIFICATION_FEED_CURSOR_TTL_MS', 86_400_000),
  feedCircuitFailureThreshold: env.get('NOTIFICATION_FEED_CIRCUIT_FAILURE_THRESHOLD', 5),
  feedCircuitOpenMs: env.get('NOTIFICATION_FEED_CIRCUIT_OPEN_MS', 30_000),
  feedShadowLagAllowanceMs: env.get('NOTIFICATION_FEED_SHADOW_LAG_ALLOWANCE_MS', 5_000),
  feedShadowSampleRate: env.get('NOTIFICATION_FEED_SHADOW_SAMPLE_RATE', 0.1),
  projectionRollbackWindowMs: env.get('NOTIFICATION_PROJECTION_ROLLBACK_WINDOW_MS', 86_400_000),
  unreadCacheTtlSeconds: env.get('NOTIFICATION_UNREAD_CACHE_TTL_SECONDS', 300),
}

function assertInteger(name: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`)
  }
}

assertInteger('NOTIFICATION_OUTBOX_BATCH_SIZE', notificationOutboxConfig.batchSize, 1, 100)
assertInteger('NOTIFICATION_OUTBOX_CONCURRENCY', notificationOutboxConfig.concurrency, 1, 8)
assertInteger(
  'NOTIFICATION_OUTBOX_LEASE_MS',
  notificationOutboxConfig.leaseDurationMs,
  1_000,
  300_000
)
assertInteger(
  'NOTIFICATION_OUTBOX_HEARTBEAT_MS',
  notificationOutboxConfig.heartbeatIntervalMs,
  100,
  notificationOutboxConfig.leaseDurationMs - 1
)
assertInteger(
  'NOTIFICATION_OUTBOX_HANDLER_DEADLINE_MS',
  notificationOutboxConfig.handlerDeadlineMs,
  100,
  notificationOutboxConfig.leaseDurationMs - 1
)
assertInteger('NOTIFICATION_OUTBOX_MAX_ATTEMPTS', notificationOutboxConfig.maxAttempts, 1, 100)
assertInteger(
  'NOTIFICATION_OUTBOX_RETRY_BASE_MS',
  notificationOutboxConfig.retryBaseMs,
  100,
  300_000
)
assertInteger(
  'NOTIFICATION_OUTBOX_RETRY_CAP_MS',
  notificationOutboxConfig.retryCapMs,
  notificationOutboxConfig.retryBaseMs,
  3_600_000
)
assertInteger('NOTIFICATION_OUTBOX_POLL_MS', notificationOutboxConfig.pollMs, 100, 60_000)
assertInteger(
  'NOTIFICATION_FANOUT_MAX_TARGETS',
  notificationOutboxConfig.fanoutMaxTargets,
  1,
  50_000
)
assertInteger('NOTIFICATION_FANOUT_BATCH_SIZE', notificationOutboxConfig.fanoutBatchSize, 1, 100)
assertInteger('NOTIFICATION_FANOUT_CONCURRENCY', notificationOutboxConfig.fanoutConcurrency, 1, 8)
assertInteger(
  'NOTIFICATION_FANOUT_LEASE_MS',
  notificationOutboxConfig.fanoutLeaseDurationMs,
  1_000,
  300_000
)
assertInteger(
  'NOTIFICATION_FANOUT_MAX_ATTEMPTS',
  notificationOutboxConfig.fanoutMaxAttempts,
  1,
  100
)
assertInteger(
  'NOTIFICATION_FANOUT_RETRY_BASE_MS',
  notificationOutboxConfig.fanoutRetryBaseMs,
  100,
  300_000
)
assertInteger(
  'NOTIFICATION_FANOUT_RETRY_CAP_MS',
  notificationOutboxConfig.fanoutRetryCapMs,
  notificationOutboxConfig.fanoutRetryBaseMs,
  3_600_000
)
assertInteger('NOTIFICATION_FANOUT_POLL_MS', notificationOutboxConfig.fanoutPollMs, 100, 60_000)
assertInteger(
  'NOTIFICATION_PIPELINE_WARN_AGE_SECONDS',
  notificationOutboxConfig.pipelineWarnAgeSeconds,
  1,
  3_600
)
assertInteger(
  'NOTIFICATION_PIPELINE_FAIL_AGE_SECONDS',
  notificationOutboxConfig.pipelineFailAgeSeconds,
  notificationOutboxConfig.pipelineWarnAgeSeconds + 1,
  86_400
)
assertInteger(
  'NOTIFICATION_PIPELINE_WARN_PENDING',
  notificationOutboxConfig.pipelineWarnPending,
  1,
  1_000_000
)
assertInteger(
  'NOTIFICATION_PIPELINE_FAIL_PENDING',
  notificationOutboxConfig.pipelineFailPending,
  notificationOutboxConfig.pipelineWarnPending + 1,
  10_000_000
)
assertInteger(
  'NOTIFICATION_FEED_CURSOR_TTL_MS',
  notificationOutboxConfig.feedCursorTtlMs,
  1_000,
  7 * 24 * 60 * 60 * 1_000
)
assertInteger(
  'NOTIFICATION_FEED_CIRCUIT_FAILURE_THRESHOLD',
  notificationOutboxConfig.feedCircuitFailureThreshold,
  1,
  100
)
assertInteger(
  'NOTIFICATION_FEED_FALLBACK_MAX_CONCURRENT',
  notificationOutboxConfig.feedFallbackMaxConcurrent,
  1,
  256
)
assertInteger(
  'NOTIFICATION_FEED_FALLBACK_GLOBAL_MAX_CONCURRENT',
  notificationOutboxConfig.feedFallbackGlobalMaxConcurrent,
  1,
  4_096
)
assertInteger(
  'NOTIFICATION_FEED_FALLBACK_ADMISSION_LEASE_MS',
  notificationOutboxConfig.feedFallbackAdmissionLeaseMs,
  1_000,
  60_000
)
assertInteger(
  'NOTIFICATION_FEED_CIRCUIT_OPEN_MS',
  notificationOutboxConfig.feedCircuitOpenMs,
  1_000,
  300_000
)
assertInteger(
  'NOTIFICATION_FEED_SHADOW_LAG_ALLOWANCE_MS',
  notificationOutboxConfig.feedShadowLagAllowanceMs,
  0,
  60_000
)
assertInteger(
  'NOTIFICATION_PROJECTION_ROLLBACK_WINDOW_MS',
  notificationOutboxConfig.projectionRollbackWindowMs,
  3_600_000,
  7 * 24 * 60 * 60 * 1_000
)
assertInteger(
  'NOTIFICATION_UNREAD_CACHE_TTL_SECONDS',
  notificationOutboxConfig.unreadCacheTtlSeconds,
  60,
  3_600
)
if (
  !Number.isFinite(notificationOutboxConfig.feedShadowSampleRate) ||
  notificationOutboxConfig.feedShadowSampleRate < 0 ||
  notificationOutboxConfig.feedShadowSampleRate > 1
) {
  throw new RangeError('NOTIFICATION_FEED_SHADOW_SAMPLE_RATE must be between 0 and 1')
}

export default notificationOutboxConfig
