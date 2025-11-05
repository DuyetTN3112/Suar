import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'

export default class ClearCacheKeyCommand {
  constructor(protected execCtx: HttpActionContext) {}

  async execute(key: string): Promise<void> {
    void this.execCtx

    if (!key) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    await cacheStore.delete(key)
  }
}
