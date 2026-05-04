import type { AccomplishmentPublicationCacheInvalidator } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_publication_cache_invalidator'
import { CACHE_COLLECTION_GENERATION_NAMESPACES } from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'

export default class AccomplishmentPublicationCacheInvalidatorAdapter
  implements AccomplishmentPublicationCacheInvalidator
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
