import type { ExecutionContext } from '#types/execution_context'
import CacheService from '#services/cache_service'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'

interface SetCacheValueDTO {
  key: string
  value: unknown
  ttl: number
}

export default class SetCacheValueCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: SetCacheValueDTO): Promise<void> {
    void this.execCtx

    if (!dto.key || dto.value === undefined) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    await CacheService.set(dto.key, dto.value, dto.ttl)
  }
}
