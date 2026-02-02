/** Accumulates field-level errors for programmatic Task validators. */
export interface FieldValidationResult<TInput extends object> {
  valid: boolean
  errors: string[]
  fieldErrors: Partial<Record<keyof TInput, string>>
}

export class FieldValidationResultBuilder<TInput extends object> {
  readonly #errors: string[] = []
  readonly #fieldErrors: Partial<Record<keyof TInput, string>> = {}

  add(field: keyof TInput, message: string | undefined): void {
    if (!message) return

    this.#errors.push(message)
    this.#fieldErrors[field] ??= message
  }

  build(): FieldValidationResult<TInput> {
    return {
      valid: this.#errors.length === 0,
      errors: [...this.#errors],
      fieldErrors: { ...this.#fieldErrors },
    }
  }
}
