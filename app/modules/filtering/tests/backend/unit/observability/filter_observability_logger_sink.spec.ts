import { test } from '@japa/runner'

import type { FilterObservabilityEvent } from '#modules/filtering/observability/filtering-observability/filter_event_factory'
import {
  FilterObservabilityLoggerSink,
  type FilterObservabilityLogger,
} from '#modules/filtering/observability/filtering-observability/filter_observability_logger_sink'

const baseEvent = (outcome: FilterObservabilityEvent['outcome']): FilterObservabilityEvent => ({
  schema_version: 'filter-observability.v1',
  event_name: `filter.query.${outcome}`,
  occurred_at: '2026-08-09T00:00:00.000Z',
  correlation: { request_id: 'request-1', session_id: null, trace_id: null },
  versions: {
    context: 'test.context',
    schema: '1',
    taxonomy: 'unknown',
    projection: 'unknown',
    ranking: 'unknown',
  },
  criteria_hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  executor: 'sql',
  latency_ms: { result: 2, facet: 0 },
  result: {
    count_relation: 'eq',
    total: 1,
    partial: outcome === 'degraded',
    degraded: outcome === 'degraded',
    timed_out: outcome === 'timeout',
    zero_result: false,
    coverage: outcome === 'degraded' ? 'partial' : 'complete',
  },
  status: {
    migration: 'not_required',
    alert: 'not_evaluated',
    activation: 'not_applicable',
    rollback: 'not_required',
  },
  outcome,
  metric_dimensions: {
    executor: 'sql',
    outcome,
    count_relation: 'eq',
    coverage: outcome === 'degraded' ? 'partial' : 'complete',
  },
  error: outcome === 'failure' ? { code: 'FILTER_DIAGNOSTIC_REDACTED', cause_count: 1 } : null,
  compliance: {
    redaction_applied: true,
    contains_sensitive_fields: false,
    retention_class:
      outcome === 'failure' || outcome === 'timeout' ? 'security_audit' : 'support_trace',
  },
})

test.group('Unit | Filter observability logger sink', () => {
  test('always emits failure and timeout events even when sampling is zero', ({ assert }) => {
    const records: Array<{ level: string; name: string; payload: Record<string, unknown> }> = []
    const logger: FilterObservabilityLogger = {
      logStructured(level, eventName, payload) {
        records.push({ level, name: eventName, payload })
      },
    }
    const sink = new FilterObservabilityLoggerSink({ logger, sampleRate: 0, random: () => 0.99 })

    sink.record(baseEvent('failure'))
    sink.record(baseEvent('timeout'))

    assert.deepEqual(
      records.map((record) => [record.level, record.name]),
      [
        ['error', 'filter.query.failure'],
        ['error', 'filter.query.timeout'],
      ]
    )
    assert.isFalse(records[0]?.payload['compliance'] === undefined)
  })

  test('samples non-critical events using a bounded low-cardinality payload', ({ assert }) => {
    const records: Array<{ level: string; name: string; payload: Record<string, unknown> }> = []
    const logger: FilterObservabilityLogger = {
      logStructured(level, eventName, payload) {
        records.push({ level, name: eventName, payload })
      },
    }
    const sink = new FilterObservabilityLoggerSink({ logger, sampleRate: 0.5, random: () => 0.75 })

    sink.record(baseEvent('success'))
    sink.record(baseEvent('degraded'))

    assert.lengthOf(records, 0)
    assert.throws(() => new FilterObservabilityLoggerSink({ logger, sampleRate: 1.1 }))
  })

  test('emits sampled events without copying criteria or provider payloads', ({ assert }) => {
    const records: Array<{ level: string; name: string; payload: Record<string, unknown> }> = []
    const logger: FilterObservabilityLogger = {
      logStructured(level, eventName, payload) {
        records.push({ level, name: eventName, payload })
      },
    }
    const sink = new FilterObservabilityLoggerSink({ logger, sampleRate: 1, random: () => 0 })

    sink.record(baseEvent('success'))

    assert.lengthOf(records, 1)
    assert.equal(records[0]?.level, 'info')
    assert.notProperty(records[0]?.payload, 'criteria')
    assert.notProperty(records[0]?.payload, 'provider_dsl')
    assert.equal(records[0]?.payload['schema_version'], 'filter-observability.v1')
  })
})
