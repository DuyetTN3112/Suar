import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  PlatformComplianceContext,
  PlatformEvent,
  PlatformEventOutcome,
  PlatformEventSeverity,
  PlatformTargetContext,
} from '#modules/observability/contracts/platform_event'
import {
  buildPlatformTraceContextFromAudit,
  buildPlatformTraceContextFromHttp,
  createCorrelationKey,
} from '#modules/observability/services/platform_trace_context'
import { buildSearchQueryPrivacyFields } from '#modules/search/observability/search_query_privacy'

interface SearchEventFactoryInput {
  readonly eventName: string
  readonly eventFamily: string
  readonly subsystem: string
  readonly workflow: string
  readonly stage: string
  readonly severity: PlatformEventSeverity
  readonly outcome: PlatformEventOutcome
  readonly actor: PlatformEvent['actor']
  readonly request: PlatformEvent['request']
  readonly trace: PlatformEvent['trace']
  readonly target: PlatformTargetContext | null
  readonly change?: Record<string, unknown> | null
  readonly runtime?: Record<string, unknown> | null
  readonly error?: Record<string, unknown> | null
  readonly compliance?: Partial<PlatformComplianceContext>
}

function baseCompliance(
  overrides: Partial<PlatformComplianceContext> | undefined
): PlatformComplianceContext {
  return {
    redaction_applied: false,
    retention_class: 'support_trace',
    contains_sensitive_fields: false,
    contains_user_input: false,
    ...overrides,
  }
}

export function buildSearchPlatformEvent(input: SearchEventFactoryInput): PlatformEvent {
  return {
    event_name: input.eventName,
    event_family: input.eventFamily,
    module: 'search',
    subsystem: input.subsystem,
    workflow: input.workflow,
    stage: input.stage,
    severity: input.severity,
    outcome: input.outcome,
    occurred_at: new Date().toISOString(),
    actor: input.actor,
    request: input.request,
    trace: input.trace,
    target: input.target,
    change: input.change ?? null,
    runtime: input.runtime ?? null,
    error: input.error ?? null,
    compliance: baseCompliance(input.compliance),
  }
}

export function buildSearchQueryEvent(
  execCtx: HttpActionContext,
  query: string,
  eventName: string,
  stage: string,
  outcome: PlatformEventOutcome,
  details: Record<string, unknown> = {}
): PlatformEvent {
  const privacy = buildSearchQueryPrivacyFields(query)
  const searchDetails = {
    query_hash: privacy.queryHash,
    query_text_length: privacy.queryTextLength,
    ...details,
  }

  return buildSearchPlatformEvent({
    eventName,
    eventFamily: 'query',
    subsystem: 'global_search',
    workflow: 'global_search',
    stage,
    severity: outcome === 'failure' ? 'error' : 'info',
    outcome,
    actor: {
      initiator_type: 'user',
      user_id: execCtx.userId,
      organization_id: execCtx.organizationId,
    },
    request: {
      id: execCtx.requestId ?? null,
      ip: execCtx.ip,
      user_agent: execCtx.userAgent,
    },
    trace: buildPlatformTraceContextFromHttp(execCtx, 'global_search', {
      correlationKey: createCorrelationKey([execCtx.userId, privacy.queryHash, 'global_search']),
    }),
    target: {
      type: 'search_query',
      id: null,
      scope: 'global_search',
    },
    change: searchDetails,
    compliance: {
      contains_user_input: privacy.queryTextLength > 0,
      redaction_applied: true,
      retention_class: 'support_trace',
    },
  })
}

export function buildSearchProjectionFailureEvent(
  execCtx: AuditActionContext,
  params: {
    readonly entityType: string
    readonly entityId: string
    readonly workflow: string
    readonly eventName: string
    readonly error: unknown
  }
): PlatformEvent {
  return buildSearchPlatformEvent({
    eventName: params.eventName,
    eventFamily: 'projection',
    subsystem: `${params.entityType}_search`,
    workflow: params.workflow,
    stage: 'failed',
    severity: 'warn',
    outcome: 'failure',
    actor: {
      initiator_type: 'listener',
      user_id: execCtx.userId,
      organization_id: execCtx.organizationId,
    },
    request: {
      id: execCtx.requestId ?? null,
      ip: execCtx.ip,
      user_agent: execCtx.userAgent,
    },
    trace: buildPlatformTraceContextFromAudit(execCtx, params.workflow, {
      correlationKey: createCorrelationKey([params.entityType, params.entityId, params.workflow]),
    }),
    target: {
      type: params.entityType,
      id: params.entityId,
      scope: `${params.entityType}_search`,
    },
    error: {
      class: params.error instanceof Error ? params.error.name : 'UnknownError',
      message: params.error instanceof Error ? params.error.message : String(params.error),
    },
    compliance: {
      redaction_applied: false,
      retention_class: 'transient_runtime',
    },
  })
}

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
  return buildSearchPlatformEvent({
    eventName: params.eventName,
    eventFamily: 'runtime',
    subsystem: 'search_runtime',
    workflow: params.workflow,
    stage: params.stage,
    severity: params.severity ?? (params.outcome === 'failure' ? 'warn' : 'info'),
    outcome: params.outcome,
    actor: {
      initiator_type: 'system',
    },
    request: null,
    trace: {
      id: createCorrelationKey([params.workflow, params.eventName]),
      workflow_id: params.workflow,
      correlation_key: createCorrelationKey([params.workflow, params.eventName, 'runtime']),
    },
    target:
      params.target ?? {
        type: 'search_runtime',
        id: null,
        scope: params.workflow,
      },
    runtime: params.runtime ?? null,
    error: params.error ?? null,
    compliance: {
      redaction_applied: false,
      retention_class: 'transient_runtime',
    },
  })
}
