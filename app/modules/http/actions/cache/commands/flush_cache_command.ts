import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import AppException from '#modules/errors/public_contracts/application_exception'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { Result } from '#modules/errors/public_contracts/result'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { BaseCommand } from '#modules/http/actions/base_command'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

export default class FlushCacheCommand extends BaseCommand<[string], void> {
  constructor(protected execCtx: HttpActionContext) {
    super()
  }

  async executeAndWrap(confirmation: string) {
    try {
      return Result.ok(await this.execute(confirmation))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  async execute(confirmation: string): Promise<void> {
    if (confirmation !== 'flush-cache') {
      throw ValidationException.field('confirmation', 'confirmation must be flush-cache')
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
