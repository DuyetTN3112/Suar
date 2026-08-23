import type { ValidationIssue } from '#modules/errors/public_contracts/validation_issue'

/** Accumulates compatibility fields and canonical issues for Task validators. */
export interface FieldValidationResult<TInput extends object> {
  valid: boolean
  errors: string[]
  fieldErrors: Partial<Record<keyof TInput, string>>
  issues: readonly ValidationIssue[]
}

export class FieldValidationResultBuilder<TInput extends object> {
  readonly #errors: string[] = []
  readonly #fieldErrors: Partial<Record<keyof TInput, string>> = {}
  readonly #issues: ValidationIssue[] = []

  add(field: keyof TInput, message: string | undefined, code = 'TASK_FIELD_INVALID'): void {
    if (!message) return

    this.#errors.push(message)
    this.#fieldErrors[field] ??= message
    this.#issues.push({ code, path: String(field), message })
  }

  build(): FieldValidationResult<TInput> {
    return {
      valid: this.#errors.length === 0,
      errors: [...this.#errors],
      fieldErrors: { ...this.#fieldErrors },
      issues: [...this.#issues],
    }
  }
}
