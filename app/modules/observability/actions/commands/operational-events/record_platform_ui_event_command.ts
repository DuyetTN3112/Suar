import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import { BaseCommand } from '#modules/observability/actions/base_command'
import type {
  PlatformComplianceContext,
  PlatformEvent,
  PlatformEventOutcome,
  PlatformEventSeverity,
  PlatformTraceContext,
} from '#modules/observability/public_contracts/platform_event'
import type {
  PlatformAuditLoggerPort,
  PlatformOperationalLoggerPort,
} from '#modules/observability/public_contracts/platform_observability'
import {
  platformAuditLogger,
  platformOperationalLogger,
} from '#modules/observability/public_contracts/platform_observability'
import {
  buildPlatformTraceContextFromHttp,
  createCorrelationKey,
} from '#modules/observability/public_contracts/platform_trace_context'
import type { RecordPlatformUiEventInput } from '#modules/observability/public_contracts/platform_ui_events'

type CurrentDate = () => Date

export default class RecordPlatformUiEventCommand extends BaseCommand<
  [RecordPlatformUiEventInput, HttpActionContext],
  void
> {
  constructor(
    private readonly currentDate: CurrentDate = () => new Date(),
    private readonly operationalLogger: Pick<
      PlatformOperationalLoggerPort,
      'log'
    > = platformOperationalLogger,
    private readonly auditLogger: Pick<PlatformAuditLoggerPort, 'record'> = platformAuditLogger
  ) {
    super()
  }

  async execute(input: RecordPlatformUiEventInput, execCtx: HttpActionContext): Promise<void> {
    const event = this.createEvent(input, execCtx)
    this.operationalLogger.log(event.severity, event)

    if (!input.persist) {
      return
    }

    await this.auditLogger.record(execCtx, event)
  }

  private createEvent(
    input: RecordPlatformUiEventInput,
    execCtx: HttpActionContext
  ): PlatformEvent {
    return {
      event_name: input.eventName,
      event_family: input.eventFamily,
      module: input.module,
      subsystem: input.subsystem,
      workflow: input.workflow,
      stage: 'completed',
      severity: this.resolveSeverity(input),
      outcome: this.resolveOutcome(input),
      occurred_at: this.currentDate().toISOString(),
      actor: {
        initiator_type: 'frontend',
        user_id: execCtx.userId,
        organization_id: execCtx.organizationId,
      },
      request: {
        id: execCtx.requestId ?? null,
        ip: execCtx.ip,
        user_agent: execCtx.userAgent,
      },
      trace: this.buildTraceContext(input, execCtx),
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
      compliance: this.buildComplianceContext(input),
    }
  }

  private resolveSeverity(input: RecordPlatformUiEventInput): PlatformEventSeverity {
    return input.severity ?? (input.eventName.includes('.failed') ? 'warn' : 'info')
  }

  private resolveOutcome(input: RecordPlatformUiEventInput): PlatformEventOutcome {
    return input.outcome ?? (input.eventName.includes('.failed') ? 'failure' : 'success')
  }

  private buildTraceContext(
    input: RecordPlatformUiEventInput,
    execCtx: HttpActionContext
  ): PlatformTraceContext {
    return buildPlatformTraceContextFromHttp(execCtx, input.workflow, {
      frontendSubmissionId: input.frontendSubmissionId ?? null,
      correlationKey: createCorrelationKey([
        input.module,
        input.workflow,
        input.frontendSubmissionId ?? input.userInputHash ?? input.targetId ?? '',
      ]),
    })
  }

  private buildComplianceContext(
    input: RecordPlatformUiEventInput
  ): PlatformComplianceContext {
    const containsUserInput = (input.userInputLength ?? 0) > 0

    return {
      redaction_applied: containsUserInput,
      retention_class: input.persist ? 'support_trace' : 'transient_runtime',
      contains_user_input: containsUserInput,
      contains_sensitive_fields: false,
    }
  }
}
