export type HttpPlatformEventSeverity = 'trace' | 'debug' | 'info' | 'warn' | 'error'
export type HttpPlatformEventOutcome = 'success' | 'failure' | 'skipped' | 'warning'

export interface HttpPlatformUiEventInput {
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
  readonly severity?: HttpPlatformEventSeverity | null
  readonly outcome?: HttpPlatformEventOutcome | null
}
