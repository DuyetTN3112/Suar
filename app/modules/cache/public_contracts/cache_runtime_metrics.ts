export type CacheDependencyLogChannel = 'read' | 'write' | 'generation' | 'lock' | 'lease'

export type CacheOperation =
  | 'read'
  | 'write'
  | 'delete'
  | 'pattern_delete'
  | 'scan'
  | 'flush'
  | 'recompute'
  | 'lock_wait'
  | 'generation_resolve'
  | 'generation_rotate'

export interface CacheOperationMetricsSnapshot {
  count: number
  errors: number
  totalDurationMs: number
  averageDurationMs: number
  maxDurationMs: number
  latencyBuckets: Record<string, number>
}

export interface CacheRuntimeMetricsSnapshot {
  processStartedAt: string
  uptimeSeconds: number
  reads: {
    total: number
    hits: number
    misses: number
    errors: number
    hitRate: number | null
  }
  writes: {
    strictSucceeded: number
    strictFailed: number
    bestEffortSucceeded: number
    bestEffortSkipped: number
  }
  invalidations: {
    singleKeyOperations: number
    patternOperations: number
    generationRotations: number
    keysUnlinked: number
    flushes: number
    errors: number
  }
  stampedeProtection: {
    lockAcquired: number
    lockContended: number
    lockUnavailable: number
    waitSucceeded: number
    waitTimedOut: number
    waitLockReleased: number
    waitUnavailable: number
    leaseExtended: number
    leaseLost: number
    leaseErrors: number
    leaseCapped: number
    recomputations: number
  }
  dependencyLogs: Record<
    CacheDependencyLogChannel,
    {
      emitted: number
      suppressed: number
      recoveries: number
    }
  >
  operations: Record<CacheOperation, CacheOperationMetricsSnapshot>
}
