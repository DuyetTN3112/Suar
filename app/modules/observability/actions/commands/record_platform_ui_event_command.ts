import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  PlatformEvent,
  PlatformEventOutcome,
  PlatformEventSeverity,
} from '#modules/observability/contracts/platform_event'
import {
  buildPlatformTraceContextFromHttp,
  createCorrelationKey,
  platformAuditLogger,
  platformOperationalLogger,
} from '#modules/observability/public_contracts/platform_observability'

export interface RecordPlatformUiEventInput {
  readonly eventName: string
  readonly module: string
  readonly subsystem: string
  readonly workflow: string
  readonly eventFamily: string
  readonly surface: string
  readonly frontendSubmissionId?: string | null
  readonly userInputHash?: string | null
  readonly userInputLength?: number | null
  readonly durationMs?: number | null
  readonly targetType?: string | null
  readonly targetId?: string | null
  readonly metadata?: Record<string, unknown> | null
  readonly persist?: boolean
  readonly severity?: PlatformEventSeverity | null
  readonly outcome?: PlatformEventOutcome | null
}

function inferSeverity(eventName: string): PlatformEventSeverity {
  return eventName.includes('.failed') ? 'warn' : 'info'
}

function inferOutcome(eventName: string): PlatformEventOutcome {
  return eventName.includes('.failed') ? 'failure' : 'success'
}

export default class RecordPlatformUiEventCommand {
  async execute(input: RecordPlatformUiEventInput, execCtx: HttpActionContext): Promise<void> {
    const severity = input.severity ?? inferSeverity(input.eventName)
    const outcome = input.outcome ?? inferOutcome(input.eventName)

    const event: PlatformEvent = {
      event_name: input.eventName,
      event_family: input.eventFamily,
      module: input.module,
      subsystem: input.subsystem,
      workflow: input.workflow,
      stage: 'completed',
      severity,
      outcome,
      occurred_at: new Date().toISOString(),
      actor: {
        initiator_type: 'frontend' as const,
        user_id: execCtx.userId,
        organization_id: execCtx.organizationId,
      },
      request: {
        id: execCtx.requestId ?? null,
        ip: execCtx.ip,
        user_agent: execCtx.userAgent,
      },
      trace: buildPlatformTraceContextFromHttp(execCtx, input.workflow, {
        frontendSubmissionId: input.frontendSubmissionId ?? null,
        correlationKey: createCorrelationKey([
          input.module,
          input.workflow,
          input.frontendSubmissionId ?? input.userInputHash ?? input.targetId ?? '',
        ]),
      }),
      target: {
        type: input.targetType ?? `${input.module}_ui_surface`,
        id: input.targetId ?? null,
        scope: input.surface,
      },
      change: {
        surface: input.surface,
        user_input_hash: input.userInputHash ?? null,
        user_input_length: input.userInputLength ?? null,
        ...(input.metadata ?? {}),
      },
      runtime: {
        duration_ms: input.durationMs ?? null,
      },
      error: null,
      compliance: {
        redaction_applied: (input.userInputLength ?? 0) > 0,
        retention_class: input.persist ? 'support_trace' : 'transient_runtime',
        contains_user_input: (input.userInputLength ?? 0) > 0,
        contains_sensitive_fields: false,
      },
    }

    platformOperationalLogger.log(severity === 'error' ? 'error' : severity, event)

    if (!input.persist) {
      return
    }

    await platformAuditLogger.record(
      {
        userId: execCtx.userId,
        ip: execCtx.ip,
        userAgent: execCtx.userAgent,
        organizationId: execCtx.organizationId,
        ...(execCtx.requestId !== undefined ? { requestId: execCtx.requestId } : {}),
        ...(execCtx.traceId !== undefined ? { traceId: execCtx.traceId } : {}),
        ...(execCtx.workflowId !== undefined ? { workflowId: execCtx.workflowId } : {}),
      },
      event
    )
  }
}
