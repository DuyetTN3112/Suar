import BusinessLogicException from '#exceptions/business_logic_exception'
import NotFoundException from '#exceptions/not_found_exception'
import CacheService from '#infra/cache/cache_service'
import { ErrorMessages } from '#modules/errors/constants/error_constants'
import type { ExecutionContext } from '#types/execution_context'

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
