import type { DatabaseId } from '#types/database'

export interface ProjectCachePort {
  invalidateProject(projectId: DatabaseId): Promise<void>
}
