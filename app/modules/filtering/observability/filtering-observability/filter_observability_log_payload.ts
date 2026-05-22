import type { FilterObservabilityEvent } from '#modules/filtering/observability/filtering-observability/filter_event_factory'

export type FilterObservabilityLogPayload = Pick<
  FilterObservabilityEvent,
  | 'schema_version'
  | 'event_name'
  | 'occurred_at'
  | 'correlation'
  | 'versions'
  | 'criteria_hash'
  | 'executor'
  | 'latency_ms'
  | 'result'
  | 'status'
  | 'outcome'
  | 'metric_dimensions'
  | 'error'
  | 'compliance'
>

export function toFilterObservabilityLogPayload(
  event: FilterObservabilityEvent
): FilterObservabilityLogPayload {
  return {
    schema_version: event.schema_version,
    event_name: event.event_name,
    occurred_at: event.occurred_at,
    correlation: event.correlation,
    versions: event.versions,
    criteria_hash: event.criteria_hash,
    executor: event.executor,
    latency_ms: event.latency_ms,
    result: event.result,
    status: event.status,
    outcome: event.outcome,
    metric_dimensions: event.metric_dimensions,
    error: event.error,
    compliance: event.compliance,
  }
}
