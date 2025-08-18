import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

export default class FlushCacheCommand {
  constructor(protected execCtx: HttpActionContext) {}

  async execute(): Promise<void> {
    void this.execCtx
    await cacheStore.flush()
  }
}
