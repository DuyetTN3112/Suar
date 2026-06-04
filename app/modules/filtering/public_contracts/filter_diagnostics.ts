export type FilterDiagnosticSeverity = 'info' | 'warning' | 'error'

export type FilterDiagnosticCode =
  | 'FILTER_CONTEXT_MISMATCH'
  | 'FILTER_SCHEMA_VERSION_MISMATCH'
  | 'FILTER_CONTEXT_UNAVAILABLE'
  | 'FILTER_CRITERIA_INVALID'
  | 'FILTER_CURSOR_INVALID'
  | 'FILTER_CURSOR_EXPIRED'
  | 'FILTER_CURSOR_STALE'
  | 'FILTER_PERMISSION_UNAVAILABLE'
  | 'FILTER_PERMISSION_INVALID'
  | 'FILTER_PERMISSION_CHANGED'
  | 'FILTER_EXECUTOR_UNAVAILABLE'
  | 'FILTER_EXECUTOR_CAPABILITY_MISMATCH'
  | 'FILTER_EXECUTOR_RESPONSE_INVALID'
  | 'FILTER_COST_LIMIT_EXCEEDED'
  | 'FILTER_DEGRADED_NOT_ALLOWED'
  | 'FILTER_PROVIDER_DEGRADED'
  | 'FILTER_PROVIDER_TIMED_OUT'
  | 'FILTER_REQUEST_ABORTED'

export interface FilterDiagnostic {
  readonly code: FilterDiagnosticCode
  readonly severity: FilterDiagnosticSeverity
  /** Optional safe field attribution; only allowlisted requested fields may cross the boundary. */
  readonly field?: string
}

const SAFE_MESSAGES: Readonly<Record<FilterDiagnosticCode, string>> = {
  FILTER_CONTEXT_MISMATCH: 'The filter context does not match the request.',
  FILTER_SCHEMA_VERSION_MISMATCH: 'The filter definition has changed.',
  FILTER_CONTEXT_UNAVAILABLE: 'The filter context is unavailable.',
  FILTER_CRITERIA_INVALID: 'The filter criteria are not supported.',
  FILTER_CURSOR_INVALID: 'The filter cursor is invalid.',
  FILTER_CURSOR_EXPIRED: 'The filter cursor has expired.',
  FILTER_CURSOR_STALE: 'The filter cursor no longer matches the active search generation.',
  FILTER_PERMISSION_UNAVAILABLE: 'The filter authorization could not be verified.',
  FILTER_PERMISSION_INVALID: 'The filter authorization constraint is invalid.',
  FILTER_PERMISSION_CHANGED: 'Filter authorization changed during execution.',
  FILTER_EXECUTOR_UNAVAILABLE: 'The filter provider is unavailable.',
  FILTER_EXECUTOR_CAPABILITY_MISMATCH: 'The filter provider is incompatible with this context.',
  FILTER_EXECUTOR_RESPONSE_INVALID: 'The filter provider returned an invalid response.',
  FILTER_COST_LIMIT_EXCEEDED: 'The filter request exceeds the allowed cost.',
  FILTER_DEGRADED_NOT_ALLOWED: 'Partial filter results are not allowed for this context.',
  FILTER_PROVIDER_DEGRADED: 'The filter provider returned partial results.',
  FILTER_PROVIDER_TIMED_OUT: 'The filter provider timed out.',
  FILTER_REQUEST_ABORTED: 'The filter request was cancelled.',
}

export class FilterExecutionError extends Error {
  readonly diagnostics: readonly FilterDiagnostic[]

  constructor(public readonly code: FilterDiagnosticCode) {
    super(SAFE_MESSAGES[code])
    this.name = 'FilterExecutionError'
    this.diagnostics = [{ code, severity: 'error' }]
  }
}
