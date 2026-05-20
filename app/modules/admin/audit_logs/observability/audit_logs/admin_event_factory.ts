import type { AdminActionContext } from '#modules/admin/audit_logs/actions/action_context'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import type {
  PlatformComplianceContext,
  PlatformEvent,
  PlatformEventOutcome,
  PlatformEventSeverity,
  PlatformTargetContext,
} from '#modules/observability/public_contracts/platform_event'
import {
  buildPlatformTraceContextFromAudit,
  createCorrelationKey,
} from '#modules/observability/public_contracts/platform_trace_context'

interface AdminEventFactoryInput {
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
    retention_class: 'security_audit',
    contains_sensitive_fields: false,
    contains_user_input: false,
    ...overrides,
  }
}

function buildAdminPlatformEvent(input: AdminEventFactoryInput): PlatformEvent {
  return {
    event_name: input.eventName,
    event_family: input.eventFamily,
    module: 'admin',
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

function buildAdminActor(execCtx: AdminActionContext): PlatformEvent['actor'] {
  return {
    initiator_type: execCtx.userId ? 'user' : 'system',
    user_id: execCtx.userId,
    organization_id: execCtx.organizationId,
    role_surface: 'system_admin',
  }
}

function buildAdminRequest(execCtx: AdminActionContext): PlatformEvent['request'] {
  return {
    id: execCtx.requestId ?? null,
    ip: execCtx.ip,
    user_agent: execCtx.userAgent,
  }
}

export function buildAdminAuditLogViewEvent(
  execCtx: AdminActionContext,
  params: {
    readonly eventName: string
    readonly stage: string
    readonly outcome: PlatformEventOutcome
    readonly actorUserId?: string | null
    readonly filters?: Record<string, unknown> | null
    readonly runtime?: Record<string, unknown> | null
    readonly error?: unknown
    readonly severity?: PlatformEventSeverity
    readonly retentionClass?: PlatformComplianceContext['retention_class']
  }
): PlatformEvent {
  return buildAdminPlatformEvent({
    eventName: params.eventName,
    eventFamily: 'audit',
    subsystem: 'audit_logs',
    workflow: 'admin_audit_log_review',
    stage: params.stage,
    severity:
      params.severity ??
      (params.outcome === 'failure' ? 'warn' : params.outcome === 'warning' ? 'warn' : 'info'),
    outcome: params.outcome,
    actor: buildAdminActor(execCtx),
    request: buildAdminRequest(execCtx),
    trace: buildPlatformTraceContextFromAudit(execCtx, 'admin_audit_log_review', {
      correlationKey: createCorrelationKey([
        execCtx.userId,
        params.actorUserId ?? 'all-users',
        'admin_audit_log_review',
      ]),
    }),
    target: {
      type: 'audit_event',
      id: null,
      scope: 'admin_audit_log_review',
      parent_type: 'admin_surface',
      parent_id: execCtx.userId,
    },
    change: {
      actor_user_id: params.actorUserId ?? null,
      ...(params.filters ?? {}),
    },
    runtime: params.runtime ?? null,
    error: serializeObservabilityError(params.error),
    compliance: {
      redaction_applied: params.error !== undefined,
      retention_class: params.retentionClass ?? 'security_audit',
    },
  })
}
