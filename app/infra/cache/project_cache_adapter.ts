import CacheService from './cache_service.js'

import type { ProjectCachePort } from '#actions/projects/ports/project_cache_port'
import type { DatabaseId } from '#types/database'

export const projectCacheAdapter: ProjectCachePort = {
  async invalidateProject(projectId: DatabaseId): Promise<void> {
    await CacheService.deleteByPattern(`perm:project:${projectId}:*`)
  },
}
