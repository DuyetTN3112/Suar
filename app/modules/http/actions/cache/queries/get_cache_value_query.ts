import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

export default class GetCacheValueQuery {
  constructor(protected execCtx: HttpActionContext) {}

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
