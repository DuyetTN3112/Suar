import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'

/**
 * Search-owned command base.
 *
 * Commands retain their raw `handle` contract for composition callers and
 * expose `executeAndWrap` at boundaries that need canonical Result semantics.
 */
export abstract class BaseCommand<TInput extends object, TOutput = void> {
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
