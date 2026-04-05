import type {
  CacheDependencyLogChannel,
  CacheOperation,
  CacheOperationMetricsSnapshot,
  CacheRuntimeMetricsSnapshot,
} from '#modules/cache/public_contracts/cache_runtime_metrics'

export type DistributedLockOutcome = 'acquired' | 'contended' | 'unavailable'
export type DistributedLockWaitOutcome = 'success' | 'timeout' | 'lock_released' | 'unavailable'
export type DistributedLockLeaseOutcome = 'extended' | 'lost' | 'error' | 'capped'
export type CacheDependencyLogOutcome = 'emitted' | 'suppressed' | 'recovered'

const LATENCY_BUCKETS_MS = [1, 5, 10, 25, 50, 100, 250, 500, 1_000, 2_000] as const

interface MutableOperationMetrics {
  count: number
  errors: number
  totalDurationMs: number
  maxDurationMs: number
  bucketCounts: number[]
  aboveMaxBucket: number
}

function createOperationMetrics(): MutableOperationMetrics {
  return {
    count: 0,
    errors: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    bucketCounts: LATENCY_BUCKETS_MS.map(() => 0),
    aboveMaxBucket: 0,
  }
}

function createOperations(): Record<CacheOperation, MutableOperationMetrics> {
  return {
    read: createOperationMetrics(),
    write: createOperationMetrics(),
    delete: createOperationMetrics(),
    pattern_delete: createOperationMetrics(),
    scan: createOperationMetrics(),
    flush: createOperationMetrics(),
    recompute: createOperationMetrics(),
    lock_wait: createOperationMetrics(),
    generation_resolve: createOperationMetrics(),
    generation_rotate: createOperationMetrics(),
  }
}

function createDependencyLogs(): CacheRuntimeMetricsSnapshot['dependencyLogs'] {
  return {
    read: { emitted: 0, suppressed: 0, recoveries: 0 },
    write: { emitted: 0, suppressed: 0, recoveries: 0 },
    generation: { emitted: 0, suppressed: 0, recoveries: 0 },
    lock: { emitted: 0, suppressed: 0, recoveries: 0 },
    lease: { emitted: 0, suppressed: 0, recoveries: 0 },
  }
}

/**
 * Process-local, low-cardinality cache telemetry.
 *
 * The snapshot is deliberately free of cache keys and values. A monitoring
 * collector can take deltas between snapshots without leaking tenant or user
 * identifiers into labels.
 */
export class CacheRuntimeMetrics {
  private processStartedAt = Date.now()
  private operations = createOperations()
  private readHits = 0
  private readMisses = 0
  private readErrors = 0
  private strictWritesSucceeded = 0
  private strictWritesFailed = 0
  private bestEffortWritesSucceeded = 0
  private bestEffortWritesSkipped = 0
  private singleKeyInvalidations = 0
  private patternInvalidations = 0
  private generationRotations = 0
  private keysUnlinked = 0
  private flushes = 0
  private invalidationErrors = 0
  private lockAcquired = 0
  private lockContended = 0
  private lockUnavailable = 0
  private lockWaitSucceeded = 0
  private lockWaitTimedOut = 0
  private lockWaitReleased = 0
  private lockWaitUnavailable = 0
  private lockLeaseExtended = 0
  private lockLeaseLost = 0
  private lockLeaseErrors = 0
  private lockLeaseCapped = 0
  private recomputations = 0
  private dependencyLogs = createDependencyLogs()

  recordOperation(operation: CacheOperation, durationMs: number, failed = false): void {
    const metric = this.operations[operation]
    const boundedDuration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0

    metric.count += 1
    metric.errors += failed ? 1 : 0
    metric.totalDurationMs += boundedDuration
    metric.maxDurationMs = Math.max(metric.maxDurationMs, boundedDuration)

    let bucketFound = false
    for (const [index, boundary] of LATENCY_BUCKETS_MS.entries()) {
      if (boundedDuration <= boundary) {
        metric.bucketCounts[index] = (metric.bucketCounts[index] ?? 0) + 1
        bucketFound = true
        break
      }
    }
    if (!bucketFound) {
      metric.aboveMaxBucket += 1
    }
  }

  recordRead(outcome: 'hit' | 'miss' | 'error'): void {
    if (outcome === 'hit') this.readHits += 1
    if (outcome === 'miss') this.readMisses += 1
    if (outcome === 'error') this.readErrors += 1
  }

  recordWrite(mode: 'strict' | 'best_effort', succeeded: boolean): void {
    if (mode === 'strict') {
      if (succeeded) this.strictWritesSucceeded += 1
      else this.strictWritesFailed += 1
      return
    }

    if (succeeded) this.bestEffortWritesSucceeded += 1
    else this.bestEffortWritesSkipped += 1
  }

  recordInvalidation(
    kind: 'single_key' | 'pattern' | 'generation' | 'flush',
    succeeded: boolean,
    keysUnlinked = 0
  ): void {
    if (kind === 'single_key') this.singleKeyInvalidations += 1
    if (kind === 'pattern') this.patternInvalidations += 1
    if (kind === 'generation') this.generationRotations += 1
    if (kind === 'flush') this.flushes += 1
    if (!succeeded) this.invalidationErrors += 1
    this.keysUnlinked += Math.max(0, keysUnlinked)
  }

  recordDistributedLock(outcome: DistributedLockOutcome): void {
    if (outcome === 'acquired') this.lockAcquired += 1
    if (outcome === 'contended') this.lockContended += 1
    if (outcome === 'unavailable') this.lockUnavailable += 1
  }

  recordLockWait(outcome: DistributedLockWaitOutcome): void {
    if (outcome === 'success') this.lockWaitSucceeded += 1
    if (outcome === 'timeout') this.lockWaitTimedOut += 1
    if (outcome === 'lock_released') this.lockWaitReleased += 1
    if (outcome === 'unavailable') this.lockWaitUnavailable += 1
  }

  recordLockLease(outcome: DistributedLockLeaseOutcome): void {
    if (outcome === 'extended') this.lockLeaseExtended += 1
    if (outcome === 'lost') this.lockLeaseLost += 1
    if (outcome === 'error') this.lockLeaseErrors += 1
    if (outcome === 'capped') this.lockLeaseCapped += 1
  }

  recordRecomputation(): void {
    this.recomputations += 1
  }

  recordDependencyLog(
    channel: CacheDependencyLogChannel,
    outcome: CacheDependencyLogOutcome
  ): void {
    const channelMetrics = this.dependencyLogs[channel]
    if (outcome === 'emitted') channelMetrics.emitted += 1
    if (outcome === 'suppressed') channelMetrics.suppressed += 1
    if (outcome === 'recovered') channelMetrics.recoveries += 1
  }

  snapshot(): CacheRuntimeMetricsSnapshot {
    const readTotal = this.readHits + this.readMisses + this.readErrors
    const operations = Object.fromEntries(
      Object.entries(this.operations).map(([name, metric]) => {
        const latencyBuckets = Object.fromEntries(
          LATENCY_BUCKETS_MS.map((boundary, index) => [
            `le_${boundary}ms`,
            metric.bucketCounts[index] ?? 0,
          ])
        )
        latencyBuckets['above_2000ms'] = metric.aboveMaxBucket

        return [
          name,
          {
            count: metric.count,
            errors: metric.errors,
            totalDurationMs: Number(metric.totalDurationMs.toFixed(3)),
            averageDurationMs:
              metric.count === 0 ? 0 : Number((metric.totalDurationMs / metric.count).toFixed(3)),
            maxDurationMs: Number(metric.maxDurationMs.toFixed(3)),
            latencyBuckets,
          },
        ]
      })
    ) as Record<CacheOperation, CacheOperationMetricsSnapshot>

    return {
      processStartedAt: new Date(this.processStartedAt).toISOString(),
      uptimeSeconds: Math.max(0, Math.floor((Date.now() - this.processStartedAt) / 1_000)),
      reads: {
        total: readTotal,
        hits: this.readHits,
        misses: this.readMisses,
        errors: this.readErrors,
        hitRate:
          this.readHits + this.readMisses === 0
            ? null
            : Number((this.readHits / (this.readHits + this.readMisses)).toFixed(6)),
      },
      writes: {
        strictSucceeded: this.strictWritesSucceeded,
        strictFailed: this.strictWritesFailed,
        bestEffortSucceeded: this.bestEffortWritesSucceeded,
        bestEffortSkipped: this.bestEffortWritesSkipped,
      },
      invalidations: {
        singleKeyOperations: this.singleKeyInvalidations,
        patternOperations: this.patternInvalidations,
        generationRotations: this.generationRotations,
        keysUnlinked: this.keysUnlinked,
        flushes: this.flushes,
        errors: this.invalidationErrors,
      },
      stampedeProtection: {
        lockAcquired: this.lockAcquired,
        lockContended: this.lockContended,
        lockUnavailable: this.lockUnavailable,
        waitSucceeded: this.lockWaitSucceeded,
        waitTimedOut: this.lockWaitTimedOut,
        waitLockReleased: this.lockWaitReleased,
        waitUnavailable: this.lockWaitUnavailable,
        leaseExtended: this.lockLeaseExtended,
        leaseLost: this.lockLeaseLost,
        leaseErrors: this.lockLeaseErrors,
        leaseCapped: this.lockLeaseCapped,
        recomputations: this.recomputations,
      },
      dependencyLogs: structuredClone(this.dependencyLogs),
      operations,
    }
  }

  resetForTests(): void {
    this.processStartedAt = Date.now()
    this.operations = createOperations()
    this.readHits = 0
    this.readMisses = 0
    this.readErrors = 0
    this.strictWritesSucceeded = 0
    this.strictWritesFailed = 0
    this.bestEffortWritesSucceeded = 0
    this.bestEffortWritesSkipped = 0
    this.singleKeyInvalidations = 0
    this.patternInvalidations = 0
    this.generationRotations = 0
    this.keysUnlinked = 0
    this.flushes = 0
    this.invalidationErrors = 0
    this.lockAcquired = 0
    this.lockContended = 0
    this.lockUnavailable = 0
    this.lockWaitSucceeded = 0
    this.lockWaitTimedOut = 0
    this.lockWaitReleased = 0
    this.lockWaitUnavailable = 0
    this.lockLeaseExtended = 0
    this.lockLeaseLost = 0
    this.lockLeaseErrors = 0
    this.lockLeaseCapped = 0
    this.recomputations = 0
    this.dependencyLogs = createDependencyLogs()
  }
}

export const cacheRuntimeMetrics = new CacheRuntimeMetrics()
