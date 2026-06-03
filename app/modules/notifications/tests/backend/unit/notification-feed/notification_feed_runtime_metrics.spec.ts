import { test } from '@japa/runner'

import {
  NotificationFeedRuntimeMetrics,
  renderNotificationFeedPrometheusMetrics,
} from '#modules/notifications/observability/notification-feed/notification_feed_runtime_metrics'

test.group('Unit | Notification Feed Runtime Metrics', () => {
  test('records only bounded source, outcome, search, and admission dimensions', ({ assert }) => {
    const metrics = new NotificationFeedRuntimeMetrics()

    metrics.recordRead('elasticsearch', 'success', 12)
    metrics.recordRead('postgres_fallback', 'failure', 50)
    metrics.recordSearch('success')
    metrics.recordSearch('failure')
    metrics.recordSearch('circuit_open')
    metrics.recordFallbackAdmission('acquired')
    metrics.recordFallbackAdmission('rejected_local')
    metrics.recordFallbackAdmission('rejected_global')
    metrics.recordFallbackAdmission('unavailable')

    const snapshot = metrics.snapshot()
    assert.equal(snapshot.reads.elasticsearch.success, 1)
    assert.equal(snapshot.reads.postgres_fallback.failure, 1)
    assert.equal(snapshot.reads.postgres_fallback.totalDurationMs, 50)
    assert.deepEqual(snapshot.search, {
      success: 1,
      failure: 1,
      circuitOpen: 1,
    })
    assert.deepEqual(snapshot.fallbackAdmission, {
      acquired: 1,
      rejectedLocal: 1,
      rejectedGlobal: 1,
      unavailable: 1,
    })

    const body = renderNotificationFeedPrometheusMetrics(snapshot)
    assert.include(body, '# TYPE suar_notification_feed_reads_total counter')
    assert.include(
      body,
      'suar_notification_feed_reads_total{source="elasticsearch",outcome="success"} 1'
    )
    assert.include(
      body,
      'suar_notification_feed_fallback_admission_total{outcome="rejected_global"} 1'
    )
    assert.notInclude(body, 'recipient')
    assert.notInclude(body, 'user_id')
  })
})
