import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

type ResultState<TData, TError> =
  | { success: true; data: TData; error: null }
  | { success: false; data: null; error: TError }

export class Result<TData = void, TError = unknown> {
  private constructor(private readonly state: ResultState<TData, TError>) {}

  static ok<TData>(data: TData): Result<TData, never>
  static ok(): Result<void, never>
  static ok<TData>(data?: TData): Result<TData, never> {
    return new Result<TData, never>({
      success: true,
      data: data as TData,
      error: null as never,
    })
  }

  static fail<TError = unknown>(error: TError): Result<never, TError> {
    return new Result<never, TError>({
      success: false,
      data: null as never,
      error,
    })
  }

  isSuccess(): this is Result<TData, TError> & { readonly data: TData } {
    return this.state.success
  }

  isFailure(): this is Result<TData, TError> & { readonly error: TError } {
    return !this.state.success
  }

  get data(): TData | null {
    return this.state.data
  }

  get error(): TError | null {
    return this.state.error
  }

  getValue(): TData {
    if (this.state.success) {
      return this.state.data
    }

    if (this.state.error instanceof Error) {
      throw this.state.error
    }

    throw new InvariantViolationException('Result contained a non-Error failure value', {
      details: { failureType: typeof this.state.error },
    })
  }

  getError(): TError {
    if (this.state.success) {
      throw new InvariantViolationException('Cannot get error from a successful Result')
    }

    return this.state.error
  }
}
