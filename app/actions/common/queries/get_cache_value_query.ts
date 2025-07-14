import type { ExecutionContext } from '#types/execution_context'
import CacheService from '#services/cache_service'
import BusinessLogicException from '#exceptions/business_logic_exception'
import NotFoundException from '#exceptions/not_found_exception'
import { ErrorMessages } from '#constants/error_constants'

export default class GetCacheValueQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(key: string): Promise<unknown> {
    void this.execCtx

    if (!key) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    const value = await CacheService.get(key)
    if (value === null) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND)
    }

    return value
  }
}
