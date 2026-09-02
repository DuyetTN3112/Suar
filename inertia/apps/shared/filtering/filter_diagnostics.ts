export type FilterFrontendDiagnosticCode =
  | 'FILTER_URL_MALFORMED'
  | 'FILTER_URL_TRUNCATED'
  | 'FILTER_URL_TOO_LARGE'
  | 'FILTER_URL_SCHEMA_UNSUPPORTED'
  | 'FILTER_URL_STATE_INVALID'
  | 'FILTER_URL_SENSITIVE_CRITERIA'
  | 'FILTER_EXECUTION_FAILED'

export interface FilterFrontendDiagnostic {
  code: FilterFrontendDiagnosticCode
  path: Array<string | number>
  message: string
  repairHint: string
}

export function filterFrontendDiagnostic(
  code: FilterFrontendDiagnosticCode,
  path: Array<string | number>,
  message: string,
  repairHint: string
): FilterFrontendDiagnostic {
  return { code, path, message, repairHint }
}
