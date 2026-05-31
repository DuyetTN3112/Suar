import { test } from '@japa/runner'

import {
  CACHE_PROMETHEUS_CONTENT_TYPE,
  renderCachePrometheusMetrics,
} from '#modules/cache/infra/adapters/cache-runtime/cache_prometheus_metrics'
import { cacheRuntimeMetrics } from '#modules/cache/infra/adapters/cache-runtime/cache_runtime_metrics'

test.group('Cache Prometheus metrics', (group) => {
  group.each.setup(() => cacheRuntimeMetrics.resetForTests())

  test('renders counters and a cumulative duration histogram without sensitive labels', ({
    assert,
  }) => {
    cacheRuntimeMetrics.recordRead('hit')
    cacheRuntimeMetrics.recordRead('miss')
    cacheRuntimeMetrics.recordWrite('best_effort', false)
    cacheRuntimeMetrics.recordInvalidation('pattern', true, 17)
    cacheRuntimeMetrics.recordInvalidation('generation', true)
    cacheRuntimeMetrics.recordDistributedLock('contended')
    cacheRuntimeMetrics.recordLockWait('timeout')
    cacheRuntimeMetrics.recordLockLease('extended')
    cacheRuntimeMetrics.recordRecomputation()
    cacheRuntimeMetrics.recordDependencyLog('read', 'emitted')
    cacheRuntimeMetrics.recordDependencyLog('read', 'suppressed')
    cacheRuntimeMetrics.recordDependencyLog('read', 'recovered')
    cacheRuntimeMetrics.recordOperation('read', 7)
    cacheRuntimeMetrics.recordOperation('read', 3)

    const output = renderCachePrometheusMetrics(cacheRuntimeMetrics.snapshot())

    assert.equal(CACHE_PROMETHEUS_CONTENT_TYPE, 'text/plain; version=0.0.4; charset=utf-8')
    assert.include(output, 'suar_cache_reads_total{outcome="hit"} 1')
    assert.include(output, 'suar_cache_reads_total{outcome="miss"} 1')
    assert.include(output, 'suar_cache_writes_total{mode="best_effort",outcome="skipped"} 1')
    assert.include(output, 'suar_cache_invalidation_keys_unlinked_total 17')
    assert.include(output, 'suar_cache_invalidations_total{kind="generation"} 1')
    assert.include(output, 'suar_cache_distributed_lock_total{outcome="contended"} 1')
    assert.include(output, 'suar_cache_lock_wait_total{outcome="timeout"} 1')
    assert.include(output, 'suar_cache_lock_lease_total{outcome="extended"} 1')
    assert.include(
      output,
      'suar_cache_dependency_log_events_total{channel="read",outcome="emitted"} 1'
    )
    assert.include(
      output,
      'suar_cache_dependency_log_events_total{channel="read",outcome="suppressed"} 1'
    )
    assert.include(
      output,
      'suar_cache_dependency_log_events_total{channel="read",outcome="recovered"} 1'
    )
    assert.include(
      output,
      'suar_cache_operation_duration_seconds_bucket{operation="read",le="0.005"} 1'
    )
    assert.include(
      output,
      'suar_cache_operation_duration_seconds_bucket{operation="read",le="+Inf"} 2'
    )
    assert.include(output, 'suar_cache_operation_duration_seconds_sum{operation="read"} 0.01')
    assert.notInclude(output, 'organization_id')
    assert.notInclude(output, 'cache_key')
  })
})
