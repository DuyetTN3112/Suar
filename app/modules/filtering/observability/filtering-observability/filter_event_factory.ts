import { createHash } from 'node:crypto'

import { sanitizeErrorLogText } from '#modules/errors/public_contracts/error_sanitization'
import {
  FILTER_OBSERVABILITY_SCHEMA_VERSION,
  type FilterObservabilityEvent,
  type FilterObservabilityEventInput,
  type FilterObservabilityOutcome,
} from '#modules/filtering/observability/filtering-observability/filter_observability_event'

export { FILTER_OBSERVABILITY_SCHEMA_VERSION } from '#modules/filtering/observability/filtering-observability/filter_observability_event'
export type {
  FilterObservabilityEvent,
  FilterObservabilityEventInput,
} from '#modules/filtering/observability/filtering-observability/filter_observability_event'

const MAX_TOKEN_LENGTH = 128
const MAX_CORRELATION_LENGTH = 256
const MAX_CAUSE_DEPTH = 32

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeToken(value: string, maxLength = MAX_TOKEN_LENGTH): string {
  const sanitized = sanitizeErrorLogText(value.trim(), maxLength)
  if (!sanitized || /[^a-zA-Z0-9_.:/-]/u.test(sanitized)) {
    throw new TypeError('Filter observability token is invalid')
  }
  return sanitized
}

function safeCorrelationId(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim() === '') return null
  return sanitizeErrorLogText(value.trim(), MAX_CORRELATION_LENGTH)
}

function stableCanonicalize(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value.normalize('NFC'))
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Criteria must contain finite numbers')
    return JSON.stringify(value)
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'bigint') return JSON.stringify(`${value}n`)
  if (typeof value === 'undefined') return 'undefined'
  if (typeof value === 'function' || typeof value === 'symbol')
    return JSON.stringify(`[${typeof value}]`)
  if (seen.has(value)) throw new TypeError('Criteria cannot be circular')
  seen.add(value)

  if (Array.isArray(value)) {
    const result = `[${value.map((entry) => stableCanonicalize(entry, seen)).join(',')}]`
    seen.delete(value)
    return result
  }

  const result = `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableCanonicalize((value as Record<string, unknown>)[key], seen)}`
    )
    .join(',')}}`
  seen.delete(value)
  return result
}

function criteriaHash(criteria: unknown): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(stableCanonicalize(criteria), 'utf8').digest('hex')}`
}

function countNestedCauses(value: unknown, depth = 0, seen = new WeakSet<object>()): number {
  if (!isRecord(value) || depth >= MAX_CAUSE_DEPTH) return 0
  if (seen.has(value)) return 0
  seen.add(value)

  const cause = value['cause']
  if (cause === undefined || cause === null) return 0
  return 1 + countNestedCauses(cause, depth + 1, seen)
}

function outcomeFor(input: FilterObservabilityEventInput): FilterObservabilityOutcome {
  if (input.result.timedOut) return 'timeout'
  if (input.result.degraded || input.result.partial) return 'degraded'
  if (input.status.migration === 'failed' || input.status.activation === 'blocked') return 'failure'
  return 'success'
}

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be non-negative`)
}

function assertEventShape(value: unknown): asserts value is FilterObservabilityEvent {
  if (!isRecord(value)) throw new TypeError('Filter observability event must be an object')
  const expected = [
    'schema_version',
    'event_name',
    'occurred_at',
    'correlation',
    'versions',
    'criteria_hash',
    'executor',
    'latency_ms',
    'result',
    'status',
    'outcome',
    'metric_dimensions',
    'error',
    'compliance',
  ].sort()
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expected)) {
    throw new TypeError('Filter observability event has unknown or missing fields')
  }
  if (value['schema_version'] !== FILTER_OBSERVABILITY_SCHEMA_VERSION) {
    throw new TypeError('Unsupported filter observability schema version')
  }
  if (typeof value['event_name'] !== 'string' || !value['event_name'])
    throw new TypeError('Invalid event name')
  if (
    typeof value['criteria_hash'] !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/u.test(value['criteria_hash'])
  ) {
    throw new TypeError('Invalid criteria hash')
  }
  if (
    !isRecord(value['correlation']) ||
    !isRecord(value['versions']) ||
    !isRecord(value['latency_ms'])
  ) {
    throw new TypeError('Missing filter observability metadata')
  }
  if (!isRecord(value['result']) || !isRecord(value['status']) || !isRecord(value['compliance'])) {
    throw new TypeError('Missing filter observability result metadata')
  }
  for (const key of ['partial', 'degraded', 'timed_out', 'zero_result']) {
    if (typeof value['result'][key] !== 'boolean') throw new TypeError(`Invalid result.${key}`)
  }
  for (const key of ['result', 'facet']) {
    if (
      typeof value['latency_ms'][key] !== 'number' ||
      !Number.isFinite(value['latency_ms'][key])
    ) {
      throw new TypeError(`Invalid latency_ms.${key}`)
    }
  }
  if (
    value['compliance']['redaction_applied'] !== true ||
    value['compliance']['contains_sensitive_fields'] !== false
  ) {
    throw new TypeError('Unsafe compliance metadata')
  }
}

export function buildFilterObservabilityEvent(
  input: FilterObservabilityEventInput
): FilterObservabilityEvent {
  assertNonNegativeFinite(input.latency.resultMs, 'result latency')
  assertNonNegativeFinite(input.latency.facetMs, 'facet latency')
  if (
    input.result.total !== null &&
    (!Number.isInteger(input.result.total) || input.result.total < 0)
  ) {
    throw new TypeError('Result total must be a non-negative integer or null')
  }

  const outcome = outcomeFor(input)
  const event: FilterObservabilityEvent = {
    schema_version: FILTER_OBSERVABILITY_SCHEMA_VERSION,
    event_name: safeToken(input.eventName),
    occurred_at: input.occurredAt
      ? new Date(input.occurredAt).toISOString()
      : new Date().toISOString(),
    correlation: {
      request_id: safeCorrelationId(input.correlation.requestId),
      session_id: safeCorrelationId(input.correlation.sessionId),
      trace_id: safeCorrelationId(input.correlation.traceId),
    },
    versions: {
      context: safeToken(input.versions.context),
      schema: safeToken(input.versions.schema),
      taxonomy: safeToken(input.versions.taxonomy),
      projection: safeToken(input.versions.projection),
      ranking: safeToken(input.versions.ranking),
    },
    criteria_hash: criteriaHash(input.canonicalCriteria),
    executor: input.executor,
    latency_ms: { result: input.latency.resultMs, facet: input.latency.facetMs },
    result: {
      count_relation: input.result.countRelation,
      total: input.result.total,
      partial: input.result.partial,
      degraded: input.result.degraded,
      timed_out: input.result.timedOut,
      zero_result: input.result.zeroResult,
      coverage: input.result.coverage,
    },
    status: {
      migration: safeToken(input.status.migration),
      alert: safeToken(input.status.alert),
      activation: safeToken(input.status.activation),
      rollback: safeToken(input.status.rollback),
    },
    outcome,
    metric_dimensions: {
      executor: input.executor,
      outcome,
      count_relation: input.result.countRelation,
      coverage: input.result.coverage,
    },
    error:
      input.diagnostics === undefined || input.diagnostics === null
        ? null
        : {
            code: 'FILTER_DIAGNOSTIC_REDACTED',
            cause_count: countNestedCauses(input.diagnostics),
          },
    compliance: {
      redaction_applied: true,
      contains_sensitive_fields: false,
      retention_class:
        outcome === 'failure' || outcome === 'timeout' ? 'security_audit' : 'support_trace',
    },
  }

  assertEventShape(event)
  return event
}

export function parseFilterObservabilityEvent(value: unknown): FilterObservabilityEvent {
  assertEventShape(value)
  return value
}
