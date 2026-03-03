import { OrganizationCacheInvalidatorAdapter } from './adapters/organization_cache_invalidator_adapter.js'

import { cacheInvalidationStore } from '#modules/cache/public_contracts/cache_store'

export const organizationCacheInvalidator = new OrganizationCacheInvalidatorAdapter(
  cacheInvalidationStore
)
