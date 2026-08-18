import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'

export abstract class BaseCommand<TArgs extends readonly unknown[], TOutput> {
  abstract execute(...args: TArgs): Promise<TOutput>

  async executeAndWrap(...args: TArgs): Promise<Result<TOutput, AppException>> {
    try {
      return Result.ok(await this.execute(...args))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}
