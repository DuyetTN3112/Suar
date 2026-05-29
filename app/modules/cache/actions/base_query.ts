import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'

export abstract class BaseQuery<TInput, TOutput> {
  abstract execute(input: TInput): Promise<TOutput>

  async executeAndWrap(input: TInput): Promise<Result<TOutput, AppException>> {
    try {
      return Result.ok(await this.execute(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}
