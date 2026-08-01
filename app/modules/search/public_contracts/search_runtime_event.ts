import type {
  PlatformEvent,
  PlatformEventOutcome,
  PlatformEventSeverity,
  PlatformTargetContext,
} from '#modules/observability/public_contracts/platform_event'
import { createCorrelationKey } from '#modules/observability/public_contracts/platform_trace_context'

export function buildSearchRuntimeEvent(params: {
  readonly eventName: string
  readonly workflow: string
  readonly stage: string
  readonly outcome: PlatformEventOutcome
  readonly severity?: PlatformEventSeverity
  readonly runtime?: Record<string, unknown> | null
  readonly error?: Record<string, unknown> | null
  readonly target?: PlatformTargetContext | null
}): PlatformEvent {
  return {
    event_name: params.eventName,
    event_family: 'runtime',
    module: 'search',
    subsystem: 'search_runtime',
    workflow: params.workflow,
    stage: params.stage,
    severity: params.severity ?? (params.outcome === 'failure' ? 'warn' : 'info'),
    outcome: params.outcome,
    occurred_at: new Date().toISOString(),
    actor: {
      initiator_type: 'system',
    },
    request: null,
    trace: {
      id: createCorrelationKey([params.workflow, params.eventName]),
      workflow_id: params.workflow,
      correlation_key: createCorrelationKey([params.workflow, params.eventName, 'runtime']),
    },
    target: params.target ?? {
      type: 'search_runtime',
      id: null,
      scope: params.workflow,
    },
    change: null,
    runtime: params.runtime ?? null,
    error: params.error ?? null,
    compliance: {
      redaction_applied: params.error !== null && params.error !== undefined,
      retention_class: 'transient_runtime',
      contains_sensitive_fields: false,
      contains_user_input: false,
    },
  }
}
