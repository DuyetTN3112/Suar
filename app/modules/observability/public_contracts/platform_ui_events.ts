import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  PlatformEventOutcome,
  PlatformEventSeverity,
} from '#modules/observability/public_contracts/platform_event'

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

export interface PlatformUiEventsCapability {
  record(input: RecordPlatformUiEventInput, execCtx: HttpActionContext): Promise<void>
}
