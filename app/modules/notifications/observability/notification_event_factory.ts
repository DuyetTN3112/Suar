import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import type {
  PlatformComplianceContext,
  PlatformEvent,
  PlatformEventOutcome,
  PlatformEventSeverity,
  PlatformTargetContext,
} from '#modules/observability/contracts/platform_event'
import {
  buildPlatformTraceContextFromAudit,
  createCorrelationKey,
} from '#modules/observability/services/platform_trace_context'

interface NotificationEventFactoryInput {
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

function buildNotificationPlatformEvent(input: NotificationEventFactoryInput): PlatformEvent {
  return {
    event_name: input.eventName,
    event_family: input.eventFamily,
    module: 'notifications',
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

function buildNotificationActor(execCtx: NotificationActionContext): PlatformEvent['actor'] {
  return {
    initiator_type: execCtx.userId ? 'user' : 'system',
    user_id: execCtx.userId,
    organization_id: execCtx.organizationId,
  }
}

function buildNotificationRequest(execCtx: NotificationActionContext): PlatformEvent['request'] {
  return {
    id: execCtx.requestId ?? null,
    ip: execCtx.ip,
    user_agent: execCtx.userAgent,
  }
}

export function buildNotificationEvent(
  execCtx: NotificationActionContext,
  params: {
    readonly eventName: string
    readonly eventFamily: string
    readonly subsystem: string
    readonly workflow: string
    readonly stage: string
    readonly outcome: PlatformEventOutcome
    readonly targetType: string
    readonly targetId: string | null
    readonly parentType?: string | null
    readonly parentId?: string | null
    readonly change?: Record<string, unknown> | null
    readonly runtime?: Record<string, unknown> | null
    readonly error?: unknown
    readonly severity?: PlatformEventSeverity
    readonly retentionClass?: PlatformComplianceContext['retention_class']
  }
): PlatformEvent {
  return buildNotificationPlatformEvent({
    eventName: params.eventName,
    eventFamily: params.eventFamily,
    subsystem: params.subsystem,
    workflow: params.workflow,
    stage: params.stage,
    severity:
      params.severity ??
      (params.outcome === 'failure'
        ? 'warn'
        : params.outcome === 'warning'
          ? 'warn'
          : 'info'),
    outcome: params.outcome,
    actor: buildNotificationActor(execCtx),
    request: buildNotificationRequest(execCtx),
    trace: buildPlatformTraceContextFromAudit(execCtx, params.workflow, {
      correlationKey: createCorrelationKey([
        execCtx.userId,
        params.targetId ?? params.targetType,
        params.workflow,
      ]),
    }),
    target: {
      type: params.targetType,
      id: params.targetId,
      scope: params.workflow,
      parent_type: params.parentType ?? 'user',
      parent_id: params.parentId ?? execCtx.userId,
    },
    change: params.change ?? null,
    runtime: params.runtime ?? null,
    error: serializeError(params.error),
    compliance: {
      retention_class: params.retentionClass ?? 'support_trace',
    },
  })
}
