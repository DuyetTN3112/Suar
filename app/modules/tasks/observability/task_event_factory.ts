import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import type {
  PlatformComplianceContext,
  PlatformEvent,
  PlatformEventOutcome,
  PlatformEventSeverity,
  PlatformTargetContext,
} from '#modules/observability/public_contracts/platform_event'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import {
  buildPlatformTraceContextFromAudit,
  createCorrelationKey,
} from '#modules/observability/public_contracts/platform_trace_context'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

interface TaskEventFactoryInput {
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

function buildTaskPlatformEvent(input: TaskEventFactoryInput): PlatformEvent {
  return {
    event_name: input.eventName,
    event_family: input.eventFamily,
    module: 'tasks',
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

function buildTaskActor(execCtx: TaskActionContext): PlatformEvent['actor'] {
  return {
    initiator_type: execCtx.userId ? 'user' : 'system',
    user_id: execCtx.userId,
    organization_id: execCtx.organizationId,
  }
}

function buildTaskRequest(execCtx: TaskActionContext): PlatformEvent['request'] {
  return {
    id: execCtx.requestId ?? null,
    ip: execCtx.ip,
    user_agent: execCtx.userAgent,
  }
}

export function buildTaskApplicationEvent(
  execCtx: TaskActionContext,
  params: {
    readonly eventName: string
    readonly stage: string
    readonly outcome: PlatformEventOutcome
    readonly taskId: string
    readonly applicationId?: string | null
    readonly change?: Record<string, unknown> | null
    readonly runtime?: Record<string, unknown> | null
    readonly error?: unknown
  }
): PlatformEvent {
  return buildTaskPlatformEvent({
    eventName: params.eventName,
    eventFamily: 'application',
    subsystem: 'task_application',
    workflow: 'task_apply',
    stage: params.stage,
    severity: params.outcome === 'failure' ? 'warn' : 'info',
    outcome: params.outcome,
    actor: buildTaskActor(execCtx),
    request: buildTaskRequest(execCtx),
    trace: buildPlatformTraceContextFromAudit(execCtx, 'task_apply', {
      correlationKey: createCorrelationKey([
        execCtx.userId,
        params.taskId,
        params.applicationId ?? 'pending',
        'task_apply',
      ]),
    }),
    target: {
      type: 'task_application',
      id: params.applicationId ?? null,
      scope: 'task_apply',
      parent_type: 'task',
      parent_id: params.taskId,
    },
    change: {
      task_id: params.taskId,
      ...(params.change ?? {}),
    },
    runtime: params.runtime ?? null,
    error: serializeObservabilityError(params.error),
    compliance: {
      redaction_applied: params.error !== undefined,
      retention_class:
        params.eventName === PLATFORM_EVENT_NAMES.TASK_APPLICATION_STARTED
          ? 'transient_runtime'
          : 'support_trace',
    },
  })
}

export function buildTaskAssignmentEvent(
  execCtx: TaskActionContext,
  params: {
    readonly eventName: string
    readonly stage: string
    readonly outcome: PlatformEventOutcome
    readonly taskId: string
    readonly assigneeId: string | null
    readonly previousAssigneeId?: string | null
    readonly assignmentAction: 'assign' | 'reassign' | 'unassign'
    readonly runtime?: Record<string, unknown> | null
    readonly error?: unknown
  }
): PlatformEvent {
  return buildTaskPlatformEvent({
    eventName: params.eventName,
    eventFamily: 'assignment',
    subsystem: 'task_assignment',
    workflow: 'task_assign',
    stage: params.stage,
    severity: params.outcome === 'failure' ? 'warn' : 'info',
    outcome: params.outcome,
    actor: buildTaskActor(execCtx),
    request: buildTaskRequest(execCtx),
    trace: buildPlatformTraceContextFromAudit(execCtx, 'task_assign', {
      correlationKey: createCorrelationKey([
        execCtx.userId,
        params.taskId,
        params.assigneeId ?? 'unassigned',
        params.assignmentAction,
      ]),
    }),
    target: {
      type: 'task',
      id: params.taskId,
      scope: 'task_assign',
    },
    change: {
      task_id: params.taskId,
      assignee_id: params.assigneeId,
      previous_assignee_id: params.previousAssigneeId ?? null,
      assignment_action: params.assignmentAction,
    },
    runtime: params.runtime ?? null,
    error: serializeObservabilityError(params.error),
    compliance: {
      redaction_applied: params.error !== undefined,
      retention_class:
        params.eventName === PLATFORM_EVENT_NAMES.TASK_ASSIGNMENT_STARTED
          ? 'transient_runtime'
          : 'support_trace',
    },
  })
}
