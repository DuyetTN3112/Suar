import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import AppException from '#modules/errors/public_contracts/application_exception'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/http/actions/base_query'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

export default class GetCacheValueQuery extends BaseQuery<[string], unknown> {
  constructor(protected execCtx: HttpActionContext) {
    super()
  }

  async executeAndWrap(key: string) {
    try {
      return Result.ok(await this.execute(key))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  async execute(key: string): Promise<unknown> {
    void this.execCtx

    if (!key) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    const value = await cacheStore.get(key)
    if (value === null) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND)
    }

    return value
  }
}
