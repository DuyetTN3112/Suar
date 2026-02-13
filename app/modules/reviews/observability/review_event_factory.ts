import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import type {
  PlatformComplianceContext,
  PlatformEvent,
  PlatformEventOutcome,
  PlatformEventSeverity,
  PlatformTargetContext,
} from '#modules/observability/public_contracts/platform_event'
import {
  buildPlatformTraceContext,
  buildPlatformTraceContextFromAudit,
  createCorrelationKey,
} from '#modules/observability/public_contracts/platform_trace_context'
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
      (params.outcome === 'failure' ? 'warn' : params.outcome === 'warning' ? 'warn' : 'info'),
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
    error: serializeObservabilityError(params.error),
    compliance: {
      redaction_applied: params.error !== undefined,
      retention_class: params.retentionClass ?? 'support_trace',
    },
  })
}

export function buildReviewAiDisputeDispatchAmbiguousEvent(params: {
  readonly evaluationId: string
  readonly sourceTable: string
  readonly staleDispatchMs: number
  readonly error: unknown
}): PlatformEvent {
  const serializedError = serializeObservabilityError(params.error)

  return buildReviewPlatformEvent({
    eventName: 'review.dispute.ai_evaluation.dispatch_ambiguous',
    eventFamily: 'dispute',
    subsystem: 'ai_dispute_reconciliation',
    workflow: 'review_dispute_ai_evaluation',
    stage: 'dispatch_ambiguous',
    severity: 'warn',
    outcome: 'warning',
    actor: {
      initiator_type: 'job',
      role_surface: 'ai_dispute_reconciliation_worker',
    },
    request: null,
    trace: buildPlatformTraceContext({
      workflow: 'review_dispute_ai_evaluation',
      correlationKey: createCorrelationKey([params.evaluationId, 'ai_dispute_reconciliation']),
    }),
    target: {
      type: 'ai_dispute_evaluation',
      id: params.evaluationId,
      scope: 'dispatch',
    },
    change: {
      durable_trigger_state: 'dispatching',
      recovery_strategy: 'retry_after_stale_deadline',
    },
    runtime: {
      source_table: params.sourceTable,
      stale_dispatch_ms: params.staleDispatchMs,
    },
    error: serializedError
      ? {
          class: serializedError['class'] ?? 'UnknownError',
        }
      : null,
    compliance: {
      redaction_applied: true,
      retention_class: 'transient_runtime',
      contains_sensitive_fields: false,
      contains_user_input: false,
    },
  })
}
