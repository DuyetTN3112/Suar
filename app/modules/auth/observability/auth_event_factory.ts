import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  PlatformComplianceContext,
  PlatformEvent,
  PlatformEventOutcome,
  PlatformEventSeverity,
  PlatformTargetContext,
} from '#modules/observability/contracts/platform_event'
import {
  buildPlatformTraceContextFromHttp,
  createCorrelationKey,
} from '#modules/observability/services/platform_trace_context'

interface AuthEventFactoryInput {
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

function serializeError(error: unknown): Record<string, unknown> | null {
  if (error instanceof Error) {
    return {
      class: error.name,
      message: error.message,
    }
  }

  if (typeof error === 'string') {
    return {
      class: 'UnknownError',
      message: error,
    }
  }

  return error && typeof error === 'object'
    ? {
        class: 'UnknownError',
        details: error,
      }
    : null
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

function buildAuthPlatformEvent(input: AuthEventFactoryInput): PlatformEvent {
  return {
    event_name: input.eventName,
    event_family: input.eventFamily,
    module: 'auth',
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

export function buildAuthLoginEvent(
  execCtx: HttpActionContext,
  params: {
    readonly eventName: string
    readonly stage: string
    readonly outcome: PlatformEventOutcome
    readonly provider: string
    readonly userId?: string | null
    readonly organizationId?: string | null
    readonly runtime?: Record<string, unknown> | null
    readonly change?: Record<string, unknown> | null
    readonly error?: unknown
  }
): PlatformEvent {
  return buildAuthPlatformEvent({
    eventName: params.eventName,
    eventFamily: 'auth',
    subsystem: 'social_login',
    workflow: 'auth_social_login',
    stage: params.stage,
    severity: params.outcome === 'failure' ? 'warn' : 'info',
    outcome: params.outcome,
    actor: {
      initiator_type: 'user',
      user_id: params.userId ?? execCtx.userId,
      organization_id: params.organizationId ?? execCtx.organizationId,
    },
    request: {
      id: execCtx.requestId ?? null,
      ip: execCtx.ip,
      user_agent: execCtx.userAgent,
    },
    trace: buildPlatformTraceContextFromHttp(execCtx, 'auth_social_login', {
      correlationKey: createCorrelationKey([
        execCtx.requestId,
        execCtx.traceId,
        params.provider,
        'auth_social_login',
      ]),
    }),
    target: {
      type: 'auth_provider',
      id: params.provider,
      scope: 'social_login',
    },
    change: {
      provider: params.provider,
      ...(params.change ?? {}),
    },
    runtime: params.runtime ?? null,
    error: serializeError(params.error),
    compliance: {
      retention_class: params.stage === 'started' ? 'transient_runtime' : 'support_trace',
    },
  })
}
