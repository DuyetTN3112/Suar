import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'

interface SetCacheValueDTO {
  key: string
  value: unknown
  ttl: number
}

export default class SetCacheValueCommand {
  constructor(protected execCtx: HttpActionContext) {}

  async execute(dto: SetCacheValueDTO): Promise<void> {
    void this.execCtx

    if (!dto.key || dto.value === undefined) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    await cacheStore.set(dto.key, dto.value, dto.ttl)
  }
}
