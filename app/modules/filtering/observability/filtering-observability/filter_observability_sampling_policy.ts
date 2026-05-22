import type { FilterObservabilityOutcome } from '#modules/filtering/observability/filtering-observability/filter_observability_event'

export interface FilterObservabilitySamplingPolicy {
  readonly sampleRate: number
  readonly random?: () => number
}

const CRITICAL_OUTCOMES: ReadonlySet<FilterObservabilityOutcome> = new Set(['failure', 'timeout'])

function assertSampleRate(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError('Filter observability sampleRate must be between 0 and 1')
  }
}

export function shouldEmitFilterObservabilityEvent(
  outcome: FilterObservabilityOutcome,
  policy: FilterObservabilitySamplingPolicy
): boolean {
  assertSampleRate(policy.sampleRate)
  if (CRITICAL_OUTCOMES.has(outcome)) return true
  const random = policy.random ?? Math.random
  const sample = random()
  if (!Number.isFinite(sample) || sample < 0 || sample > 1) {
    throw new RangeError('Filter observability random sample must be between 0 and 1')
  }
  return sample < policy.sampleRate
}
