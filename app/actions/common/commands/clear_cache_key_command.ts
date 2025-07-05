import type { ExecutionContext } from '#types/execution_context'
import CacheService from '#infra/cache/cache_service'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'

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
