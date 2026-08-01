import type { ProjectTaskCacheInvalidator } from '#modules/projects/actions/ports/outbound/project_task_cache_invalidator'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'

export class ProjectTaskCacheInvalidatorAdapter implements ProjectTaskCacheInvalidator {
  constructor(private readonly taskCache: TaskCachePort) {}

  invalidateTaskCollectionMetadata(organizationId: string): Promise<void> {
    return this.taskCache.invalidateAfterTaskCollectionMetadataChanged(organizationId)
  }
}
