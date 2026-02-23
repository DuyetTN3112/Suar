import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { ProjectCachePort } from '#modules/projects/actions/ports/project_cache_port'

export class ProjectCacheInvalidator implements ProjectCachePort {
  async invalidateProject(projectId: string): Promise<void> {
    await cacheStore.deleteByPattern(`perm:project:${projectId}:*`)
  }
}
