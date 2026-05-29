export type CacheDependencyLogChannel = 'read' | 'write' | 'generation' | 'lock' | 'lease'

export const CACHE_DEPENDENCY_LOG_DEFAULT_INTERVAL_MS = 30_000
export const CACHE_DEPENDENCY_LOG_MIN_INTERVAL_MS = 1_000
export const CACHE_DEPENDENCY_LOG_MAX_INTERVAL_MS = 300_000

export function resolveCacheDependencyLogIntervalMs(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    return CACHE_DEPENDENCY_LOG_DEFAULT_INTERVAL_MS
  }

  const parsed = Number(value)
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < CACHE_DEPENDENCY_LOG_MIN_INTERVAL_MS ||
    parsed > CACHE_DEPENDENCY_LOG_MAX_INTERVAL_MS
  ) {
    throw new RangeError(
      `Cache dependency failure log interval must be an integer between ${CACHE_DEPENDENCY_LOG_MIN_INTERVAL_MS} and ${CACHE_DEPENDENCY_LOG_MAX_INTERVAL_MS} milliseconds`
    )
  }

  return parsed
}

interface FailureState {
  firstFailureAt: number
  lastEmissionAt: number
  totalFailures: number
  suppressedSinceLastEmission: number
}

export interface CacheDependencyFailureDecision {
  emit: boolean
  suppressedFailures: number
}

export interface CacheDependencyRecovery {
  outageDurationMs: number
  totalFailures: number
  suppressedFailures: number
}

/**
 * Process-local gate that bounds dependency-failure logs without hiding errors
 * from counters. Each low-cardinality channel emits its first failure, emits at
 * most once per configured interval afterward, and reports one recovery event.
 */
export class CacheDependencyLogGate {
  private readonly failures = new Map<CacheDependencyLogChannel, FailureState>()

  constructor(
    private readonly intervalMs: number,
    private readonly clock: () => number = () => performance.now()
  ) {
    if (
      !Number.isSafeInteger(intervalMs) ||
      intervalMs < CACHE_DEPENDENCY_LOG_MIN_INTERVAL_MS ||
      intervalMs > CACHE_DEPENDENCY_LOG_MAX_INTERVAL_MS
    ) {
      throw new RangeError(
        `Cache dependency failure log interval must be an integer between ${CACHE_DEPENDENCY_LOG_MIN_INTERVAL_MS} and ${CACHE_DEPENDENCY_LOG_MAX_INTERVAL_MS} milliseconds`
      )
    }
  }

  recordFailure(channel: CacheDependencyLogChannel): CacheDependencyFailureDecision {
    const observedAt = this.clock()
    const state = this.failures.get(channel)
    if (!state) {
      this.failures.set(channel, {
        firstFailureAt: observedAt,
        lastEmissionAt: observedAt,
        totalFailures: 1,
        suppressedSinceLastEmission: 0,
      })
      return { emit: true, suppressedFailures: 0 }
    }

    state.totalFailures += 1
    if (observedAt - state.lastEmissionAt < this.intervalMs) {
      state.suppressedSinceLastEmission += 1
      return { emit: false, suppressedFailures: 0 }
    }

    const suppressedFailures = state.suppressedSinceLastEmission
    state.lastEmissionAt = observedAt
    state.suppressedSinceLastEmission = 0
    return { emit: true, suppressedFailures }
  }

  recordSuccess(channel: CacheDependencyLogChannel): CacheDependencyRecovery | null {
    const state = this.failures.get(channel)
    if (!state) {
      return null
    }

    this.failures.delete(channel)
    return {
      outageDurationMs: Math.max(0, this.clock() - state.firstFailureAt),
      totalFailures: state.totalFailures,
      suppressedFailures: state.suppressedSinceLastEmission,
    }
  }

  reset(): void {
    this.failures.clear()
  }
}
