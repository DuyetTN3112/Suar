import { cacheInvalidationStore } from '#modules/cache/public_contracts/cache_store'
import type { ProjectCachePort } from '#modules/projects/actions/ports/outbound/project_cache_port'

interface ProjectPatternCacheStore {
  deleteByPattern(pattern: string): Promise<void>
}

export function invalidateProjectCaches(
  _projectId: string,
  store: ProjectPatternCacheStore = cacheInvalidationStore
): Promise<void> {
  // Project visibility and presentation fields are embedded in the public/self
  // work-history projection. This is a generation rotation, not a Redis scan.
  return store.deleteByPattern('users:work_history:*')
}

export async function invalidateProjectCollectionCaches(
  store: ProjectPatternCacheStore = cacheInvalidationStore
): Promise<void> {
  await store.deleteByPattern('task:metadata:*')
}

export function invalidateProjectMembershipCaches(
  _projectId: string,
  userId: string,
  store: ProjectPatternCacheStore = cacheInvalidationStore
): Promise<void> {
  // Revocation-sensitive projections must rotate synchronously. Permission
  // checks remain authoritative, while these scoped generations prevent a
  // former member from replaying previously authorized cached payloads.
  return Promise.all([
    store.deleteByPattern(`user:pending_reviews:*:userId:${userId}`),
    store.deleteByPattern(`users:work_history:${userId}:*`),
    store.deleteByPattern(`tasks:grouped:*:user:${userId}:*`),
    store.deleteByPattern(`tasks:timeline:*:user:${userId}:*`),
    store.deleteByPattern(`task:stats:*:user:${userId}:*`),
  ]).then(() => undefined)
}

export class ProjectCacheInvalidator implements ProjectCachePort {
  async invalidateProject(projectId: string): Promise<void> {
    await invalidateProjectCaches(projectId)
  }
}
