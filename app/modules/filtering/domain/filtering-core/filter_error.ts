export type FilterErrorPathSegment = string | number

export interface FilterValidationError {
  path: FilterErrorPathSegment[]
  code: string
  repairHint: string
}

export interface FilterValidationResult {
  valid: boolean
  errors: FilterValidationError[]
}

export class FilterSemanticError extends Error {
  constructor(
    public readonly code: string,
    public readonly repairHint: string
  ) {
    super(code)
    this.name = 'FilterSemanticError'
  }
}
