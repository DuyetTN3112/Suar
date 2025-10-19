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
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

interface ReviewEventFactoryInput {
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

function buildReviewPlatformEvent(input: ReviewEventFactoryInput): PlatformEvent {
  return {
    event_name: input.eventName,
    event_family: input.eventFamily,
    module: 'reviews',
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

function buildReviewActor(execCtx: ReviewActionContext): PlatformEvent['actor'] {
  return {
    initiator_type: execCtx.userId ? 'user' : 'system',
    user_id: execCtx.userId,
    organization_id: execCtx.organizationId,
  }
}

function buildReviewRequest(execCtx: ReviewActionContext): PlatformEvent['request'] {
  return {
    id: execCtx.requestId ?? null,
    ip: execCtx.ip,
    user_agent: execCtx.userAgent,
  }
}

export function buildReviewDisputeEvent(
  execCtx: ReviewActionContext,
  params: {
    readonly eventName: string
    readonly eventFamily: string
    readonly subsystem: string
    readonly workflow: string
    readonly stage: string
    readonly outcome: PlatformEventOutcome
    readonly disputeId: string | null
    readonly reviewSessionId?: string | null
    readonly taskAssignmentId?: string | null
    readonly taskId?: string | null
    readonly revieweeId?: string | null
    readonly change?: Record<string, unknown> | null
    readonly runtime?: Record<string, unknown> | null
    readonly error?: unknown
    readonly severity?: PlatformEventSeverity
    readonly retentionClass?: PlatformComplianceContext['retention_class']
  }
): PlatformEvent {
  return buildReviewPlatformEvent({
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
    actor: buildReviewActor(execCtx),
    request: buildReviewRequest(execCtx),
    trace: buildPlatformTraceContextFromAudit(execCtx, params.workflow, {
      correlationKey: createCorrelationKey([
        execCtx.userId,
        params.disputeId ?? 'pending',
        params.reviewSessionId ?? '',
        params.workflow,
      ]),
    }),
    target: {
      type: 'review_dispute',
      id: params.disputeId,
      scope: params.workflow,
      parent_type: 'review_session',
      parent_id: params.reviewSessionId ?? null,
    },
    change: {
      review_session_id: params.reviewSessionId ?? null,
      task_assignment_id: params.taskAssignmentId ?? null,
      task_id: params.taskId ?? null,
      reviewee_id: params.revieweeId ?? null,
      ...(params.change ?? {}),
    },
    runtime: params.runtime ?? null,
    error: serializeError(params.error),
    compliance: {
      retention_class: params.retentionClass ?? 'support_trace',
    },
  })
}
