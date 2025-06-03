import type { ExecutionContext } from '#types/execution_context'
import CacheService from '#services/cache_service'

export default class FlushCacheCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(): Promise<void> {
    void this.execCtx
    await CacheService.flush()
  }
}
