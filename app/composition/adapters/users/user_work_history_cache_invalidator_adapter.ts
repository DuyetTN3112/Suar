import { CACHE_COLLECTION_GENERATION_NAMESPACES } from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { ReviewUserWorkHistoryCacheInvalidator } from '#modules/reviews/actions/ports/outbound/review_user_work_history_cache_invalidator'

export default class UserWorkHistoryCacheInvalidatorAdapter
  implements ReviewUserWorkHistoryCacheInvalidator
{
  async invalidateUserWorkHistory(userId: string): Promise<void> {
    await Promise.all([
      cacheStore.rotateGeneration(CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory),
      cacheStore.rotateGeneration(
        `${CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory}:user:${userId}`
      ),
    ])
  }
}
