import CacheService from '#modules/cache/infra/cache_service'
import type { ExecutionContext } from '#types/execution_context'

export default class FlushCacheCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(): Promise<void> {
    void this.execCtx
    await CacheService.flush()
  }
}
