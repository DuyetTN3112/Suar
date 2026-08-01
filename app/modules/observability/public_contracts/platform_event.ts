export type PlatformEventSeverity = 'trace' | 'debug' | 'info' | 'warn' | 'error'

export type PlatformEventOutcome = 'success' | 'failure' | 'skipped' | 'warning'

export type PlatformRetentionClass =
  | 'transient_runtime'
  | 'support_trace'
  | 'security_audit'
  | 'compliance_audit'

export interface PlatformActorContext {
  readonly initiator_type: 'user' | 'system' | 'cli' | 'listener' | 'frontend' | 'job'
  readonly user_id?: string | null
  readonly organization_id?: string | null
  readonly session_id?: string | null
  readonly role_surface?: string | null
  readonly [key: string]: unknown
}

export interface PlatformRequestContext {
  readonly id: string | null
  readonly method?: string | null
  readonly route?: string | null
  readonly url?: string | null
  readonly ip?: string | null
  readonly user_agent?: string | null
}

export interface PlatformTraceContext {
  readonly id: string
  readonly workflow_id: string
  readonly parent_id?: string | null
  readonly frontend_submission_id?: string | null
  readonly correlation_key?: string | null
}

export interface PlatformTargetContext {
  readonly type: string
  readonly id: string | null
  readonly scope?: string | null
  readonly parent_type?: string | null
  readonly parent_id?: string | null
  readonly [key: string]: unknown
}

export interface PlatformComplianceContext {
  readonly redaction_applied: boolean
  readonly retention_class: PlatformRetentionClass
  readonly contains_user_input?: boolean
  readonly contains_sensitive_fields?: boolean
}

export interface PlatformEvent {
  readonly event_name: string
  readonly event_family: string
  readonly module: string
  readonly subsystem: string
  readonly workflow: string
  readonly stage: string
  readonly severity: PlatformEventSeverity
  readonly outcome: PlatformEventOutcome
  readonly occurred_at: string
  readonly actor: PlatformActorContext
  readonly request: PlatformRequestContext | null
  readonly trace: PlatformTraceContext
  readonly target: PlatformTargetContext | null
  readonly change: Record<string, unknown> | null
  readonly runtime: Record<string, unknown> | null
  readonly error: Record<string, unknown> | null
  readonly compliance: PlatformComplianceContext
}
