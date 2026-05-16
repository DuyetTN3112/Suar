import type {
  CacheOperationMetricsSnapshot,
  CacheRuntimeMetricsSnapshot,
} from '#modules/cache/public_contracts/cache_runtime_metrics'

export const CACHE_PROMETHEUS_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8'

function metric(
  lines: string[],
  name: string,
  value: number,
  labels: Record<string, string> = {}
): void {
  const labelEntries = Object.entries(labels)
  const suffix =
    labelEntries.length === 0
      ? ''
      : `{${labelEntries.map(([key, label]) => `${key}="${label}"`).join(',')}}`
  lines.push(`${name}${suffix} ${value}`)
}

function declare(
  lines: string[],
  name: string,
  type: 'counter' | 'gauge' | 'histogram',
  help: string
) {
  lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`)
}

function renderOperationHistogram(
  lines: string[],
  operation: string,
  snapshot: CacheOperationMetricsSnapshot
): void {
  let cumulativeCount = 0
  for (const [bucket, count] of Object.entries(snapshot.latencyBuckets)) {
    const match = /^le_(\d+)ms$/.exec(bucket)
    if (!match) {
      continue
    }
    cumulativeCount += count
    metric(lines, 'suar_cache_operation_duration_seconds_bucket', cumulativeCount, {
      operation,
      le: String(Number(match[1]) / 1_000),
    })
  }
  metric(lines, 'suar_cache_operation_duration_seconds_bucket', snapshot.count, {
    operation,
    le: '+Inf',
  })
  metric(lines, 'suar_cache_operation_duration_seconds_sum', snapshot.totalDurationMs / 1_000, {
    operation,
  })
  metric(lines, 'suar_cache_operation_duration_seconds_count', snapshot.count, { operation })
  metric(lines, 'suar_cache_operation_errors_total', snapshot.errors, { operation })
}

/**
 * Render process-local, low-cardinality cache telemetry in Prometheus text
 * exposition format. No logical cache key, value, user, or tenant label enters
 * this boundary.
 */
export function renderCachePrometheusMetrics(snapshot: CacheRuntimeMetricsSnapshot): string {
  const lines: string[] = []

  declare(
    lines,
    'suar_cache_process_start_time_seconds',
    'gauge',
    'Unix time when this application process cache telemetry started.'
  )
  metric(
    lines,
    'suar_cache_process_start_time_seconds',
    Date.parse(snapshot.processStartedAt) / 1_000
  )
  declare(
    lines,
    'suar_cache_process_uptime_seconds',
    'gauge',
    'Application process cache telemetry uptime in seconds.'
  )
  metric(lines, 'suar_cache_process_uptime_seconds', snapshot.uptimeSeconds)

  declare(lines, 'suar_cache_reads_total', 'counter', 'Cache reads by outcome.')
  metric(lines, 'suar_cache_reads_total', snapshot.reads.hits, { outcome: 'hit' })
  metric(lines, 'suar_cache_reads_total', snapshot.reads.misses, { outcome: 'miss' })
  metric(lines, 'suar_cache_reads_total', snapshot.reads.errors, { outcome: 'error' })

  declare(lines, 'suar_cache_writes_total', 'counter', 'Cache writes by mode and outcome.')
  metric(lines, 'suar_cache_writes_total', snapshot.writes.strictSucceeded, {
    mode: 'strict',
    outcome: 'success',
  })
  metric(lines, 'suar_cache_writes_total', snapshot.writes.strictFailed, {
    mode: 'strict',
    outcome: 'failure',
  })
  metric(lines, 'suar_cache_writes_total', snapshot.writes.bestEffortSucceeded, {
    mode: 'best_effort',
    outcome: 'success',
  })
  metric(lines, 'suar_cache_writes_total', snapshot.writes.bestEffortSkipped, {
    mode: 'best_effort',
    outcome: 'skipped',
  })

  declare(
    lines,
    'suar_cache_invalidations_total',
    'counter',
    'Cache invalidation operations by kind.'
  )
  metric(lines, 'suar_cache_invalidations_total', snapshot.invalidations.singleKeyOperations, {
    kind: 'single_key',
  })
  metric(lines, 'suar_cache_invalidations_total', snapshot.invalidations.patternOperations, {
    kind: 'pattern',
  })
  metric(lines, 'suar_cache_invalidations_total', snapshot.invalidations.generationRotations, {
    kind: 'generation',
  })
  metric(lines, 'suar_cache_invalidations_total', snapshot.invalidations.flushes, {
    kind: 'flush',
  })
  declare(
    lines,
    'suar_cache_invalidation_errors_total',
    'counter',
    'Failed cache invalidation operations.'
  )
  metric(lines, 'suar_cache_invalidation_errors_total', snapshot.invalidations.errors)
  declare(
    lines,
    'suar_cache_invalidation_keys_unlinked_total',
    'counter',
    'Cache keys removed by invalidation operations.'
  )
  metric(lines, 'suar_cache_invalidation_keys_unlinked_total', snapshot.invalidations.keysUnlinked)

  declare(
    lines,
    'suar_cache_distributed_lock_total',
    'counter',
    'Distributed cache fill lock attempts by outcome.'
  )
  metric(lines, 'suar_cache_distributed_lock_total', snapshot.stampedeProtection.lockAcquired, {
    outcome: 'acquired',
  })
  metric(lines, 'suar_cache_distributed_lock_total', snapshot.stampedeProtection.lockContended, {
    outcome: 'contended',
  })
  metric(lines, 'suar_cache_distributed_lock_total', snapshot.stampedeProtection.lockUnavailable, {
    outcome: 'unavailable',
  })
  declare(
    lines,
    'suar_cache_lock_wait_total',
    'counter',
    'Distributed cache fill waits by outcome.'
  )
  metric(lines, 'suar_cache_lock_wait_total', snapshot.stampedeProtection.waitSucceeded, {
    outcome: 'success',
  })
  metric(lines, 'suar_cache_lock_wait_total', snapshot.stampedeProtection.waitTimedOut, {
    outcome: 'timeout',
  })
  metric(lines, 'suar_cache_lock_wait_total', snapshot.stampedeProtection.waitLockReleased, {
    outcome: 'lock_released',
  })
  metric(lines, 'suar_cache_lock_wait_total', snapshot.stampedeProtection.waitUnavailable, {
    outcome: 'unavailable',
  })
  declare(
    lines,
    'suar_cache_lock_lease_total',
    'counter',
    'Distributed cache fill lease heartbeats by outcome.'
  )
  metric(lines, 'suar_cache_lock_lease_total', snapshot.stampedeProtection.leaseExtended, {
    outcome: 'extended',
  })
  metric(lines, 'suar_cache_lock_lease_total', snapshot.stampedeProtection.leaseLost, {
    outcome: 'lost',
  })
  metric(lines, 'suar_cache_lock_lease_total', snapshot.stampedeProtection.leaseErrors, {
    outcome: 'error',
  })
  metric(lines, 'suar_cache_lock_lease_total', snapshot.stampedeProtection.leaseCapped, {
    outcome: 'capped',
  })
  declare(
    lines,
    'suar_cache_recomputations_total',
    'counter',
    'Source recomputations performed after cache misses.'
  )
  metric(lines, 'suar_cache_recomputations_total', snapshot.stampedeProtection.recomputations)

  declare(
    lines,
    'suar_cache_dependency_log_events_total',
    'counter',
    'Cache dependency log decisions by emitted, suppressed, or recovered outcome.'
  )
  for (const [channel, channelMetrics] of Object.entries(snapshot.dependencyLogs)) {
    metric(lines, 'suar_cache_dependency_log_events_total', channelMetrics.emitted, {
      channel,
      outcome: 'emitted',
    })
    metric(lines, 'suar_cache_dependency_log_events_total', channelMetrics.suppressed, {
      channel,
      outcome: 'suppressed',
    })
    metric(lines, 'suar_cache_dependency_log_events_total', channelMetrics.recoveries, {
      channel,
      outcome: 'recovered',
    })
  }

  declare(
    lines,
    'suar_cache_operation_duration_seconds',
    'histogram',
    'Cache operation duration in seconds by low-cardinality operation.'
  )
  declare(
    lines,
    'suar_cache_operation_errors_total',
    'counter',
    'Cache operation failures by low-cardinality operation.'
  )
  for (const [operation, operationMetrics] of Object.entries(snapshot.operations)) {
    renderOperationHistogram(lines, operation, operationMetrics)
  }

  return `${lines.join('\n')}\n`
}
