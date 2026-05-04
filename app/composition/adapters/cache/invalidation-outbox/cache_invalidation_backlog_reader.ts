import { PostgresCacheInvalidationOutboxRepository } from '#modules/cache/infra/repositories/invalidation-outbox/postgres_cache_invalidation_outbox_repository'

export const cacheInvalidationBacklogReader = new PostgresCacheInvalidationOutboxRepository()
