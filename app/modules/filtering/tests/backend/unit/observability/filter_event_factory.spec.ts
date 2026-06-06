import { test } from '@japa/runner'

import {
  buildFilterObservabilityEvent,
  FILTER_OBSERVABILITY_SCHEMA_VERSION,
  parseFilterObservabilityEvent,
} from '#modules/filtering/observability/filtering-observability/filter_event_factory'

const sensitiveInput = {
  rawQuery: 'raw-query-canary',
  criteria: {
    salary: { operator: 'gte', value: 'criteria-value-canary' },
    nested: [{ value: 'nested-criteria-canary' }],
  },
  aliases: ['taxonomy-alias-canary'],
  cursor: 'cursor-canary',
  providerDsl: { query: { match: { hidden: 'provider-dsl-canary' } } },
  hiddenValues: ['hidden-value-canary'],
  protectedTrait: 'protected-trait-canary',
  resultBody: { secret: 'result-body-canary' },
  prompt: 'prompt-canary',
  secret: 'secret-canary',
  error: {
    message: 'top-error-canary\r\nforged=true',
    cause: {
      message: 'nested-cause-canary',
      requestBody: 'request-body-canary',
      cause: { detail: 'deep-cause-canary' },
    },
  },
}

test.group('Unit | Filtering Observability | Event Factory', () => {
  test('builds a versioned event with correlation, version, hash, latency, and outcome metadata', ({
    assert,
  }) => {
    const event = buildFilterObservabilityEvent({
      eventName: 'filter.query.completed',
      occurredAt: '2026-08-09T10:00:00.000Z',
      correlation: {
        requestId: 'request-123',
        sessionId: 'session-123',
        traceId: 'trace-123',
      },
      versions: {
        context: 'context-v3',
        schema: 'schema-v4',
        taxonomy: 'taxonomy-v5',
        projection: 'projection-v6',
        ranking: 'ranking-v7',
      },
      canonicalCriteria: { status: 'open', labels: ['a', 'b'] },
      executor: 'elasticsearch',
      latency: { resultMs: 17, facetMs: 5 },
      result: {
        countRelation: 'eq',
        total: 2,
        partial: false,
        degraded: false,
        timedOut: false,
        zeroResult: false,
        coverage: 'complete',
      },
      status: {
        migration: 'not_required',
        alert: 'not_evaluated',
        activation: 'not_applicable',
        rollback: 'not_required',
      },
    })

    assert.equal(event.schema_version, FILTER_OBSERVABILITY_SCHEMA_VERSION)
    assert.equal(event.event_name, 'filter.query.completed')
    assert.deepEqual(event.correlation, {
      request_id: 'request-123',
      session_id: 'session-123',
      trace_id: 'trace-123',
    })
    assert.deepEqual(event.versions, {
      context: 'context-v3',
      schema: 'schema-v4',
      taxonomy: 'taxonomy-v5',
      projection: 'projection-v6',
      ranking: 'ranking-v7',
    })
    assert.match(event.criteria_hash, /^sha256:[0-9a-f]{64}$/)
    assert.equal(event.executor, 'elasticsearch')
    assert.deepEqual(event.latency_ms, { result: 17, facet: 5 })
    assert.equal(event.result.count_relation, 'eq')
    assert.isFalse(event.result.partial)
    assert.isFalse(event.result.degraded)
    assert.isFalse(event.result.timed_out)
    assert.isFalse(event.result.zero_result)
    assert.equal(event.result.coverage, 'complete')
    assert.deepEqual(event.status, {
      migration: 'not_required',
      alert: 'not_evaluated',
      activation: 'not_applicable',
      rollback: 'not_required',
    })
  })

  test('redacts raw inputs, payloads, secrets, control characters, and nested causes', ({
    assert,
  }) => {
    const event = buildFilterObservabilityEvent({
      eventName: 'filter.query.failed',
      correlation: { requestId: 'request-redaction', sessionId: 'session-redaction' },
      versions: {
        context: 'context-v1',
        schema: 'schema-v1',
        taxonomy: 'taxonomy-v1',
        projection: 'projection-v1',
        ranking: 'ranking-v1',
      },
      canonicalCriteria: { private: 'canonical-private-value' },
      executor: 'reference',
      latency: { resultMs: 1, facetMs: 2 },
      result: {
        countRelation: 'gte',
        total: null,
        partial: true,
        degraded: true,
        timedOut: true,
        zeroResult: false,
        coverage: 'partial',
      },
      status: {
        migration: 'failed',
        alert: 'paused',
        activation: 'blocked',
        rollback: 'available',
      },
      diagnostics: sensitiveInput,
    })

    const serialized = JSON.stringify(event)
    for (const canary of [
      'raw-query-canary',
      'criteria-value-canary',
      'nested-criteria-canary',
      'taxonomy-alias-canary',
      'cursor-canary',
      'provider-dsl-canary',
      'hidden-value-canary',
      'protected-trait-canary',
      'result-body-canary',
      'prompt-canary',
      'secret-canary',
      'top-error-canary',
      'nested-cause-canary',
      'request-body-canary',
      'deep-cause-canary',
      'canonical-private-value',
    ]) {
      assert.notInclude(serialized, canary)
    }

    assert.equal(event.result.degraded, true)
    assert.equal(event.result.timed_out, true)
    assert.equal(event.compliance.redaction_applied, true)
    assert.notInclude(serialized, '\\r')
    assert.notInclude(serialized, '\\n')
    assert.property(event, 'error')
  })

  test('keeps metric dimensions bounded to approved low-cardinality fields', ({ assert }) => {
    const event = buildFilterObservabilityEvent({
      eventName: 'filter.query.degraded',
      correlation: { requestId: 'request-metrics' },
      versions: {
        context: 'context-v1',
        schema: 'schema-v1',
        taxonomy: 'taxonomy-v1',
        projection: 'projection-v1',
        ranking: 'ranking-v1',
      },
      canonicalCriteria: {},
      executor: 'sql',
      latency: { resultMs: 10, facetMs: 0 },
      result: {
        countRelation: 'eq',
        total: 0,
        partial: false,
        degraded: true,
        timedOut: false,
        zeroResult: true,
        coverage: 'complete',
      },
      status: {
        migration: 'not_required',
        alert: 'not_evaluated',
        activation: 'not_applicable',
        rollback: 'not_required',
      },
    })

    assert.deepEqual(event.metric_dimensions, {
      executor: 'sql',
      outcome: 'degraded',
      count_relation: 'eq',
      coverage: 'complete',
    })
    assert.notProperty(event.metric_dimensions, 'request_id')
    assert.notProperty(event.metric_dimensions, 'criteria_hash')
  })

  test('validates the versioned schema and rejects stale or incomplete events', ({ assert }) => {
    const event = buildFilterObservabilityEvent({
      eventName: 'filter.query.started',
      correlation: { requestId: 'request-schema' },
      versions: {
        context: 'context-v1',
        schema: 'schema-v1',
        taxonomy: 'taxonomy-v1',
        projection: 'projection-v1',
        ranking: 'ranking-v1',
      },
      canonicalCriteria: {},
      executor: 'reference',
      latency: { resultMs: 0, facetMs: 0 },
      result: {
        countRelation: 'eq',
        total: 0,
        partial: false,
        degraded: false,
        timedOut: false,
        zeroResult: true,
        coverage: 'complete',
      },
      status: {
        migration: 'not_required',
        alert: 'not_evaluated',
        activation: 'not_applicable',
        rollback: 'not_required',
      },
    })

    assert.deepEqual(parseFilterObservabilityEvent(event), event)
    assert.throws(() => parseFilterObservabilityEvent({ ...event, schema_version: 'v0' }))
    assert.throws(() => parseFilterObservabilityEvent({ ...event, criteria_hash: 'raw-criteria' }))
    assert.throws(() =>
      parseFilterObservabilityEvent({
        ...event,
        result: { ...event.result, degraded: 'yes' },
      })
    )
  })
})
