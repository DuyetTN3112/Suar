import { test } from '@japa/runner'

import type { FilterObservabilityEvent } from '#modules/filtering/observability/filtering-observability/filter_event_factory'
import { toFilterObservabilityLogPayload } from '#modules/filtering/observability/filtering-observability/filter_observability_log_payload'

const event = {
  schema_version: 'filter-observability.v1',
  event_name: 'filter.query.completed',
  occurred_at: '2026-08-09T00:00:00.000Z',
  correlation: { request_id: 'request-1', session_id: 'session-1', trace_id: null },
  versions: {
    context: 'test.context',
    schema: '1',
    taxonomy: 'tax-1',
    projection: 'projection-1',
    ranking: 'ranking-1',
  },
  criteria_hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  executor: 'sql',
  latency_ms: { result: 2, facet: 1 },
  result: {
    count_relation: 'eq',
    total: 1,
    partial: false,
    degraded: false,
    timed_out: false,
    zero_result: false,
    coverage: 'complete',
  },
  status: {
    migration: 'not_required',
    alert: 'not_evaluated',
    activation: 'not_applicable',
    rollback: 'not_required',
  },
  outcome: 'success',
  metric_dimensions: {
    executor: 'sql',
    outcome: 'success',
    count_relation: 'eq',
    coverage: 'complete',
  },
  error: null,
  compliance: {
    redaction_applied: true,
    contains_sensitive_fields: false,
    retention_class: 'support_trace',
  },
} as const satisfies FilterObservabilityEvent

test.group('Unit | Filter observability log payload', () => {
  test('uses an explicit safe allowlist and omits query/provider fields', ({ assert }) => {
    const payload = toFilterObservabilityLogPayload(event)

    assert.deepEqual(Object.keys(payload).sort(), [
      'compliance',
      'correlation',
      'criteria_hash',
      'error',
      'event_name',
      'executor',
      'latency_ms',
      'metric_dimensions',
      'occurred_at',
      'outcome',
      'result',
      'schema_version',
      'status',
      'versions',
    ])
    assert.notProperty(payload, 'criteria')
    assert.notProperty(payload, 'provider_dsl')
    assert.notProperty(payload, 'cursor')
  })
})
