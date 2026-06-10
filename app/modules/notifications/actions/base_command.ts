import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'

/** Notification-owned command base for explicit-input commands. */
export abstract class BaseCommand<TInput extends object, TOutput = void> {
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
