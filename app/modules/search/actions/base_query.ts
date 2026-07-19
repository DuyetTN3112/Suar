import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'

/**
 * Search-owned query base.
 *
 * Search queries keep their raw `handle` contract for internal composition and
 * expose `executeAndWrap` for HTTP/application boundaries that need a Result.
 */
export abstract class BaseQuery<TInput extends object, TOutput> {
  abstract handle(input: TInput): Promise<TOutput>

  async executeAndWrap(input: TInput): Promise<Result<TOutput, AppException>> {
    try {
      return Result.ok(await this.handle(input))
    } catch (error) {
      if (error instanceof AppException) {
        return Result.fail(error)
      }

      throw error
    }
  }
}
