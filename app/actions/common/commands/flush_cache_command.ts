import type { ExecutionContext } from '#types/execution_context'
import CacheService from '#infra/cache/cache_service'

export default class FlushCacheCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(): Promise<void> {
    void this.execCtx
    await CacheService.flush()
  }
}
