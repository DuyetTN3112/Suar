import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

export default class FlushCacheCommand {
  constructor(protected execCtx: HttpActionContext) {}

  async execute(confirmation: string): Promise<void> {
    if (confirmation !== 'flush-cache') {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }
    if (!this.execCtx.userId) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    await auditPublicApi.write(this.execCtx, {
      user_id: this.execCtx.userId,
      action: 'cache_flush_requested',
      entity_type: 'cache',
      entity_id: 'cache-db',
      new_values: { scope: 'cache_connection' },
      critical: true,
    })
    await cacheStore.flush()
  }
}
