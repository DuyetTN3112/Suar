import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import {
  CACHE_MAX_KEY_BYTES,
  CACHE_MAX_TTL_SECONDS,
  safeCacheLogContext,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

interface SetCacheValueDTO {
  key: string
  value: unknown
  ttl: number
}

export default class SetCacheValueCommand {
  constructor(protected execCtx: HttpActionContext) {}

  async execute(dto: SetCacheValueDTO): Promise<void> {
    void this.execCtx

    if (
      !dto.key ||
      Buffer.byteLength(dto.key, 'utf8') > CACHE_MAX_KEY_BYTES ||
      dto.value === undefined ||
      !Number.isSafeInteger(dto.ttl) ||
      dto.ttl < 1 ||
      dto.ttl > CACHE_MAX_TTL_SECONDS ||
      !this.execCtx.userId
    ) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }
    const cacheIdentifier = safeCacheLogContext(dto.key)

    await auditPublicApi.write(this.execCtx, {
      user_id: this.execCtx.userId,
      action: 'cache_key_set_requested',
      entity_type: 'cache_key',
      entity_id: cacheIdentifier.cacheIdentifierHash,
      new_values: { ...cacheIdentifier, ttl_seconds: dto.ttl },
      critical: true,
    })
    await cacheStore.set(dto.key, dto.value, dto.ttl)
  }
}
