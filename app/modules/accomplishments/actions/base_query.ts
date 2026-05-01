import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'

/**
 * Accomplishments-owned query base reserved for read-side use cases.
 *
 * The module currently exposes projection commands only; keeping the query
 * contract local prevents future reads from depending on another module's
 * base abstraction.
 */
export abstract class BaseQuery<TInput extends object, TOutput> {
  abstract execute(input: TInput): Promise<TOutput>

  async executeAndWrap(input: TInput): Promise<Result<TOutput, AppException>> {
    try {
      return Result.ok(await this.execute(input))
    } catch (error) {
      if (error instanceof AppException) {
        return Result.fail(error)
      }

      throw error
    }
  }
}
