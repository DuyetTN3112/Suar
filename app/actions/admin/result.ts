type ResultState<T, E> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: E }

export class Result<TData = void, TError = unknown> {
  private constructor(private readonly state: ResultState<TData, TError>) {}

  /**
   * Create a successful result
   */
  static ok<TData>(data: TData): Result<TData, never>
  static ok(): Result<void, never>
  static ok<TData>(data?: TData): Result<TData, never> {
    return new Result<TData, never>({
      success: true,
      data: (data ?? null) as TData,
      error: null as never,
    })
  }

  /**
   * Create a failed result
   */
  static fail<TError = Error>(error: TError): Result<never, TError> {
    return new Result<never, TError>({
      success: false,
      data: null as never,
      error,
    })
  }

  /**
   * Type guards for narrowing
   */
  isSuccess(): this is Result<TData, TError> & { readonly data: TData } {
    return this.state.success
  }

  isFailure(): this is Result<TData, TError> & { readonly error: TError } {
    return !this.state.success
  }

  /**
   * Safe accessors (Read-only)
   */
  get data(): TData | null {
    return this.state.data
  }

  get error(): TError | null {
    return this.state.error
  }

  /**
   * Get data or throw error if failed
   */
  getValue(): TData {
    const { state } = this
    if (state.success) {
      return state.data
    }

    if (state.error instanceof Error) {
      throw state.error
    }
    throw new Error(String(state.error))
  }

  /**
   * Get error or throw if successful
   */
  getError(): TError {
    const { state } = this
    if (!state.success) {
      return state.error
    }
    throw new Error('Cannot get error from successful result')
  }
}
