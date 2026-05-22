export const FILTER_OBSERVABILITY_SCHEMA_VERSION = 'filter-observability.v1' as const

export type FilterObservabilityCountRelation = 'eq' | 'gte'
export type FilterObservabilityCoverage = 'complete' | 'partial' | 'unknown'
export type FilterObservabilityExecutor = 'reference' | 'sql' | 'elasticsearch' | 'unknown'
export type FilterObservabilityOutcome = 'success' | 'degraded' | 'failure' | 'timeout'

export interface FilterObservabilityEventInput {
  readonly eventName: string
  readonly occurredAt?: string
  readonly correlation: {
    readonly requestId?: string | null
    readonly sessionId?: string | null
    readonly traceId?: string | null
  }
  readonly versions: {
    readonly context: string
    readonly schema: string
    readonly taxonomy: string
    readonly projection: string
    readonly ranking: string
  }
  /** Canonical criteria are hashed and never copied to the event. */
  readonly canonicalCriteria: unknown
  readonly executor: FilterObservabilityExecutor
  readonly latency: {
    readonly resultMs: number
    readonly facetMs: number
  }
  readonly result: {
    readonly countRelation: FilterObservabilityCountRelation
    readonly total: number | null
    readonly partial: boolean
    readonly degraded: boolean
    readonly timedOut: boolean
    readonly zeroResult: boolean
    readonly coverage: FilterObservabilityCoverage
  }
  readonly status: {
    readonly migration: string
    readonly alert: string
    readonly activation: string
    readonly rollback: string
  }
  /** Untrusted provider/error diagnostics. They are summarized, never copied. */
  readonly diagnostics?: unknown
}

export interface FilterObservabilityEvent {
  readonly schema_version: typeof FILTER_OBSERVABILITY_SCHEMA_VERSION
  readonly event_name: string
  readonly occurred_at: string
  readonly correlation: {
    readonly request_id: string | null
    readonly session_id: string | null
    readonly trace_id: string | null
  }
  readonly versions: {
    readonly context: string
    readonly schema: string
    readonly taxonomy: string
    readonly projection: string
    readonly ranking: string
  }
  readonly criteria_hash: `sha256:${string}`
  readonly executor: FilterObservabilityExecutor
  readonly latency_ms: {
    readonly result: number
    readonly facet: number
  }
  readonly result: {
    readonly count_relation: FilterObservabilityCountRelation
    readonly total: number | null
    readonly partial: boolean
    readonly degraded: boolean
    readonly timed_out: boolean
    readonly zero_result: boolean
    readonly coverage: FilterObservabilityCoverage
  }
  readonly status: {
    readonly migration: string
    readonly alert: string
    readonly activation: string
    readonly rollback: string
  }
  readonly outcome: FilterObservabilityOutcome
  readonly metric_dimensions: {
    readonly executor: FilterObservabilityExecutor
    readonly outcome: FilterObservabilityOutcome
    readonly count_relation: FilterObservabilityCountRelation
    readonly coverage: FilterObservabilityCoverage
  }
  readonly error: {
    readonly code: 'FILTER_DIAGNOSTIC_REDACTED'
    readonly cause_count: number
  } | null
  readonly compliance: {
    readonly redaction_applied: true
    readonly contains_sensitive_fields: false
    readonly retention_class: 'transient_runtime' | 'support_trace' | 'security_audit'
  }
}
