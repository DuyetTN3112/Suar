import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'

/** Module-local command base; Filtering does not depend on another module's base. */
export abstract class BaseCommand<TInput = unknown, TOutput = unknown> {
  abstract handle(input: TInput): Promise<TOutput>

  async executeAndWrap(input: TInput): Promise<Result<TOutput, AppException>> {
    try {
      return Result.ok(await this.handle(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}
