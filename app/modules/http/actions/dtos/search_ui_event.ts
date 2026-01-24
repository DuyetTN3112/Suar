export interface HttpSearchUiEventInput {
  readonly eventName: string
  readonly surface: string
  readonly frontendSubmissionId?: string | null
  readonly queryHash?: string | null
  readonly queryTextLength?: number | null
  readonly durationMs?: number | null
  readonly resultCounts?: Record<string, number> | null
  readonly entityType?: string | null
  readonly entityId?: string | null
  readonly metadata?: Record<string, unknown> | null
}
