/**
 * Result wrapper for Command/Query operations
 * Provides a standardized way to return success/failure from Actions
 */
export class Result<TData = void, TError = Error> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly data?: TData,
    public readonly error?: TError
  ) {}

  /**
   * Create a successful result
   */
  static ok<TData>(data?: TData): Result<TData> {
    return new Result<TData>(true, data, undefined)
  }

  /**
   * Create a failed result
   */
  static fail<TError = Error>(error: TError): Result<void, TError> {
    return new Result<void, TError>(false, undefined, error)
  }

  /**
   * Check if result is successful
   */
  get isFailure(): boolean {
    return !this.isSuccess
  }

  /**
   * Get data or throw error if failed
   */
  getValue(): TData {
    if (this.isFailure) {
      throw this.error
    }
    return this.data!
  }

  /**
   * Get error or throw if successful
   */
  getError(): TError {
    if (this.isSuccess) {
      throw new Error('Cannot get error from successful result')
    }
    return this.error!
  }
}
