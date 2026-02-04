import BusinessLogicException from '#exceptions/business_logic_exception'
import CacheService from '#infra/cache/cache_service'
import { ErrorMessages } from '#modules/errors/constants/error_constants'
import type { ExecutionContext } from '#types/execution_context'

export default class ClearCacheKeyCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(key: string): Promise<void> {
    void this.execCtx

    if (!key) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    await CacheService.delete(key)
  }
}
