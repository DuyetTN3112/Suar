import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'

export abstract class BaseCommand {
  protected async wrap<T>(operation: () => Promise<T>): Promise<Result<T, AppException>> {
    try {
      return Result.ok(await operation())
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}
