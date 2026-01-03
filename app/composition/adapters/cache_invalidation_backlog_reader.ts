import { PostgresCacheInvalidationOutboxRepository } from '#modules/cache/infra/postgres_cache_invalidation_outbox_repository'

export const cacheInvalidationBacklogReader = new PostgresCacheInvalidationOutboxRepository()
