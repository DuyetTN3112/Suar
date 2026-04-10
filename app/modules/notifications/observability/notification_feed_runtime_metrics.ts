export type NotificationFeedReadSource = 'postgres' | 'elasticsearch' | 'postgres_fallback'
export type NotificationSearchReadOutcome = 'success' | 'failure' | 'circuit_open'
export type NotificationFallbackAdmissionOutcome =
  | 'acquired'
  | 'rejected_local'
  | 'rejected_global'
  | 'unavailable'

export interface NotificationFeedTelemetry {
  recordRead(
    source: NotificationFeedReadSource,
    outcome: 'success' | 'failure',
    durationMs: number
  ): void
  recordSearch(outcome: NotificationSearchReadOutcome): void
  recordFallbackAdmission(outcome: NotificationFallbackAdmissionOutcome): void
}

const READ_SOURCES = ['postgres', 'elasticsearch', 'postgres_fallback'] as const
const LATENCY_BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1_000, 2_000] as const

interface MutableReadMetrics {
  success: number
  failure: number
  totalDurationMs: number
  maxDurationMs: number
  bucketCounts: number[]
  aboveMaxBucket: number
}

export interface NotificationFeedReadMetricsSnapshot {
  success: number
  failure: number
  totalDurationMs: number
  averageDurationMs: number
  maxDurationMs: number
  latencyBuckets: Record<string, number>
}

export interface NotificationFeedRuntimeMetricsSnapshot {
  processStartedAt: string
  uptimeSeconds: number
  reads: Record<NotificationFeedReadSource, NotificationFeedReadMetricsSnapshot>
  search: {
    success: number
    failure: number
    circuitOpen: number
  }
  fallbackAdmission: {
    acquired: number
    rejectedLocal: number
    rejectedGlobal: number
    unavailable: number
  }
}

function mutableReadMetrics(): MutableReadMetrics {
  return {
    success: 0,
    failure: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    bucketCounts: LATENCY_BUCKETS_MS.map(() => 0),
    aboveMaxBucket: 0,
  }
}

function mutableReads(): Record<NotificationFeedReadSource, MutableReadMetrics> {
  return {
    postgres: mutableReadMetrics(),
    elasticsearch: mutableReadMetrics(),
    postgres_fallback: mutableReadMetrics(),
  }
}

/**
 * Process-local notification feed telemetry with a fixed label vocabulary.
 *
 * Recipient, tenant, cursor, query, exception message, and record identifiers
 * never enter this state or the Prometheus rendering boundary.
 */
export class NotificationFeedRuntimeMetrics implements NotificationFeedTelemetry {
  private processStartedAt = Date.now()
  private reads = mutableReads()
  private searchSuccess = 0
  private searchFailure = 0
  private searchCircuitOpen = 0
  private admissionAcquired = 0
  private admissionRejectedLocal = 0
  private admissionRejectedGlobal = 0
  private admissionUnavailable = 0

  recordRead(
    source: NotificationFeedReadSource,
    outcome: 'success' | 'failure',
    durationMs: number
  ): void {
    const readMetric = this.reads[source]
    const boundedDuration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0
    readMetric[outcome] += 1
    readMetric.totalDurationMs += boundedDuration
    readMetric.maxDurationMs = Math.max(readMetric.maxDurationMs, boundedDuration)

    const bucketIndex = LATENCY_BUCKETS_MS.findIndex((boundary) => boundedDuration <= boundary)
    if (bucketIndex === -1) {
      readMetric.aboveMaxBucket += 1
    } else {
      readMetric.bucketCounts[bucketIndex] = (readMetric.bucketCounts[bucketIndex] ?? 0) + 1
    }
  }

  recordSearch(outcome: NotificationSearchReadOutcome): void {
    if (outcome === 'success') this.searchSuccess += 1
    if (outcome === 'failure') this.searchFailure += 1
    if (outcome === 'circuit_open') this.searchCircuitOpen += 1
  }

  recordFallbackAdmission(outcome: NotificationFallbackAdmissionOutcome): void {
    if (outcome === 'acquired') this.admissionAcquired += 1
    if (outcome === 'rejected_local') this.admissionRejectedLocal += 1
    if (outcome === 'rejected_global') this.admissionRejectedGlobal += 1
    if (outcome === 'unavailable') this.admissionUnavailable += 1
  }

  snapshot(): NotificationFeedRuntimeMetricsSnapshot {
    const reads = Object.fromEntries(
      READ_SOURCES.map((source) => {
        const readMetric = this.reads[source]
        const count = readMetric.success + readMetric.failure
        const latencyBuckets = Object.fromEntries(
          LATENCY_BUCKETS_MS.map((boundary, index) => [
            `le_${boundary}ms`,
            readMetric.bucketCounts[index] ?? 0,
          ])
        )
        latencyBuckets['above_2000ms'] = readMetric.aboveMaxBucket

        return [
          source,
          {
            success: readMetric.success,
            failure: readMetric.failure,
            totalDurationMs: Number(readMetric.totalDurationMs.toFixed(3)),
            averageDurationMs:
              count === 0 ? 0 : Number((readMetric.totalDurationMs / count).toFixed(3)),
            maxDurationMs: Number(readMetric.maxDurationMs.toFixed(3)),
            latencyBuckets,
          },
        ]
      })
    ) as Record<NotificationFeedReadSource, NotificationFeedReadMetricsSnapshot>

    return {
      processStartedAt: new Date(this.processStartedAt).toISOString(),
      uptimeSeconds: Math.max(0, Math.floor((Date.now() - this.processStartedAt) / 1_000)),
      reads,
      search: {
        success: this.searchSuccess,
        failure: this.searchFailure,
        circuitOpen: this.searchCircuitOpen,
      },
      fallbackAdmission: {
        acquired: this.admissionAcquired,
        rejectedLocal: this.admissionRejectedLocal,
        rejectedGlobal: this.admissionRejectedGlobal,
        unavailable: this.admissionUnavailable,
      },
    }
  }

  resetForTests(): void {
    this.processStartedAt = Date.now()
    this.reads = mutableReads()
    this.searchSuccess = 0
    this.searchFailure = 0
    this.searchCircuitOpen = 0
    this.admissionAcquired = 0
    this.admissionRejectedLocal = 0
    this.admissionRejectedGlobal = 0
    this.admissionUnavailable = 0
  }
}

export const NOTIFICATION_FEED_PROMETHEUS_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8'

function metric(
  lines: string[],
  name: string,
  value: number,
  labels: Record<string, string> = {}
): void {
  const entries = Object.entries(labels)
  const suffix =
    entries.length === 0 ? '' : `{${entries.map(([key, label]) => `${key}="${label}"`).join(',')}}`
  lines.push(`${name}${suffix} ${value}`)
}

function declare(
  lines: string[],
  name: string,
  type: 'counter' | 'gauge' | 'histogram',
  help: string
): void {
  lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`)
}

export function renderNotificationFeedPrometheusMetrics(
  snapshot: NotificationFeedRuntimeMetricsSnapshot
): string {
  const lines: string[] = []

  declare(
    lines,
    'suar_notification_feed_process_start_time_seconds',
    'gauge',
    'Unix time when this application process notification feed telemetry started.'
  )
  metric(
    lines,
    'suar_notification_feed_process_start_time_seconds',
    Date.parse(snapshot.processStartedAt) / 1_000
  )
  declare(
    lines,
    'suar_notification_feed_process_uptime_seconds',
    'gauge',
    'Application process notification feed telemetry uptime in seconds.'
  )
  metric(lines, 'suar_notification_feed_process_uptime_seconds', snapshot.uptimeSeconds)

  declare(
    lines,
    'suar_notification_feed_reads_total',
    'counter',
    'Notification feed reads by bounded source and outcome.'
  )
  declare(
    lines,
    'suar_notification_feed_read_duration_seconds',
    'histogram',
    'Notification feed read duration by bounded source.'
  )
  for (const source of READ_SOURCES) {
    const read = snapshot.reads[source]
    metric(lines, 'suar_notification_feed_reads_total', read.success, {
      source,
      outcome: 'success',
    })
    metric(lines, 'suar_notification_feed_reads_total', read.failure, {
      source,
      outcome: 'failure',
    })

    let cumulative = 0
    for (const [bucket, count] of Object.entries(read.latencyBuckets)) {
      const match = /^le_(\d+)ms$/.exec(bucket)
      if (!match) {
        continue
      }
      cumulative += count
      metric(lines, 'suar_notification_feed_read_duration_seconds_bucket', cumulative, {
        source,
        le: String(Number(match[1]) / 1_000),
      })
    }
    metric(
      lines,
      'suar_notification_feed_read_duration_seconds_bucket',
      read.success + read.failure,
      { source, le: '+Inf' }
    )
    metric(
      lines,
      'suar_notification_feed_read_duration_seconds_sum',
      read.totalDurationMs / 1_000,
      { source }
    )
    metric(
      lines,
      'suar_notification_feed_read_duration_seconds_count',
      read.success + read.failure,
      { source }
    )
  }

  declare(
    lines,
    'suar_notification_feed_search_total',
    'counter',
    'Elasticsearch feed attempts by bounded outcome.'
  )
  metric(lines, 'suar_notification_feed_search_total', snapshot.search.success, {
    outcome: 'success',
  })
  metric(lines, 'suar_notification_feed_search_total', snapshot.search.failure, {
    outcome: 'failure',
  })
  metric(lines, 'suar_notification_feed_search_total', snapshot.search.circuitOpen, {
    outcome: 'circuit_open',
  })

  declare(
    lines,
    'suar_notification_feed_fallback_admission_total',
    'counter',
    'PostgreSQL fallback admission attempts by bounded outcome.'
  )
  metric(
    lines,
    'suar_notification_feed_fallback_admission_total',
    snapshot.fallbackAdmission.acquired,
    { outcome: 'acquired' }
  )
  metric(
    lines,
    'suar_notification_feed_fallback_admission_total',
    snapshot.fallbackAdmission.rejectedLocal,
    { outcome: 'rejected_local' }
  )
  metric(
    lines,
    'suar_notification_feed_fallback_admission_total',
    snapshot.fallbackAdmission.rejectedGlobal,
    { outcome: 'rejected_global' }
  )
  metric(
    lines,
    'suar_notification_feed_fallback_admission_total',
    snapshot.fallbackAdmission.unavailable,
    { outcome: 'unavailable' }
  )

  return `${lines.join('\n')}\n`
}

export const notificationFeedRuntimeMetrics = new NotificationFeedRuntimeMetrics()
