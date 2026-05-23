import { test } from '@japa/runner'

import {
  shouldEmitFilterObservabilityEvent,
  type FilterObservabilitySamplingPolicy,
} from '#modules/filtering/observability/filtering-observability/filter_observability_sampling_policy'

test.group('Unit | Filter observability sampling policy', () => {
  test('never samples out failure or timeout events', ({ assert }) => {
    const policy: FilterObservabilitySamplingPolicy = { sampleRate: 0, random: () => 0.99 }

    assert.isTrue(shouldEmitFilterObservabilityEvent('failure', policy))
    assert.isTrue(shouldEmitFilterObservabilityEvent('timeout', policy))
  })

  test('uses a deterministic bounded rate for non-critical outcomes', ({ assert }) => {
    assert.isTrue(
      shouldEmitFilterObservabilityEvent('success', { sampleRate: 0.5, random: () => 0.49 })
    )
    assert.isFalse(
      shouldEmitFilterObservabilityEvent('degraded', { sampleRate: 0.5, random: () => 0.5 })
    )
    assert.throws(() => shouldEmitFilterObservabilityEvent('success', { sampleRate: -0.1 }))
    assert.throws(() => shouldEmitFilterObservabilityEvent('success', { sampleRate: 1.1 }))
  })
})
