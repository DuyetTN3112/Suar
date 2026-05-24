import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { safeCacheLogContext } from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import AppException from '#modules/errors/public_contracts/application_exception'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { Result } from '#modules/errors/public_contracts/result'
import { BaseCommand } from '#modules/http/actions/base_command'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

export default class ClearCacheKeyCommand extends BaseCommand<[string], void> {
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

  async execute(key: string): Promise<void> {
    void this.execCtx

    if (!key || !this.execCtx.userId) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }
    const cacheIdentifier = safeCacheLogContext(key)

    await auditPublicApi.write(this.execCtx, {
      user_id: this.execCtx.userId,
      action: 'cache_key_clear_requested',
      entity_type: 'cache_key',
      entity_id: cacheIdentifier.cacheIdentifierHash,
      old_values: cacheIdentifier,
      critical: true,
    })
    await cacheStore.delete(key)
  }
}
