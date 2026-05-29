import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'

export abstract class BaseCommand<TInput extends object, TOutput, TContext = never> {
  abstract execute(input: TInput, context: TContext): Promise<TOutput>

  async executeAndWrap(
    input: TInput,
    context: TContext
  ): Promise<Result<TOutput, AppException>> {
    try {
      return Result.ok(await this.execute(input, context))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}
