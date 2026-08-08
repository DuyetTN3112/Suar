import {
  taskListCacheInvalidationPattern,
  taskMetadataCacheInvalidationPattern,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheInvalidationStore } from '#modules/cache/public_contracts/cache_store'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'

interface TaskPatternCacheStore {
  deleteByPattern(pattern: string): Promise<void>
}

export class TaskCacheInvalidator implements TaskCachePort {
  constructor(private readonly store: TaskPatternCacheStore = cacheInvalidationStore) {}

  async invalidateAfterTaskCreated(organizationId?: string): Promise<void> {
    await this.invalidateTaskCollections(true, organizationId)
  }

  async invalidateAfterTaskCollectionMetadataChanged(organizationId?: string): Promise<void> {
    await this.invalidateTaskCollections(true, organizationId)
  }

  async invalidateAfterTaskUpdated(taskId: string, organizationId?: string): Promise<void> {
    await Promise.all([
      this.invalidateTaskScopedCaches(taskId),
      this.invalidateTaskCollections(true, organizationId),
    ])
  }

  async invalidateAfterTaskDeleted(taskId: string, organizationId?: string): Promise<void> {
    await Promise.all([
      this.invalidateAfterTaskUpdated(taskId, organizationId),
      this.store.deleteByPattern(`task:applications:*:taskId:${taskId}:*`),
      this.store.deleteByPattern('user:applications:*'),
    ])
  }

  async invalidateAfterTaskAssigned(taskId: string, organizationId?: string): Promise<void> {
    await Promise.all([
      this.invalidateTaskScopedCaches(taskId),
      this.invalidateTaskCollections(false, organizationId),
      this.store.deleteByPattern(`task:applications:*:taskId:${taskId}:*`),
    ])
  }

  async invalidateAfterTaskAccessChanged(taskId: string, organizationId?: string): Promise<void> {
    await Promise.all([
      this.invalidateTaskScopedCaches(taskId),
      this.invalidateTaskCollections(false, organizationId),
    ])
  }

  async invalidateAfterTaskApplicationChanged(
    taskId: string,
    organizationId?: string,
    applicantId?: string
  ): Promise<void> {
    await Promise.all([
      this.invalidateTaskScopedCaches(taskId),
      this.invalidateTaskCollections(false, organizationId),
      this.store.deleteByPattern(`task:applications:*:taskId:${taskId}:*`),
      this.store.deleteByPattern(
        applicantId ? `user:applications:*:userId:${applicantId}*` : 'user:applications:*'
      ),
    ])
  }

  async invalidateTaskScopedCaches(taskId: string): Promise<void> {
    await this.store.deleteByPattern(`task:audit:${taskId}:*`)
  }

  private async invalidateTaskCollections(
    includeMetadata = false,
    organizationId?: string
  ): Promise<void> {
    const patterns = [
      organizationId ? taskListCacheInvalidationPattern(organizationId) : 'tasks:list:*',
      'tasks:public:*',
      organizationId ? `task:user:*:org:${organizationId}:*` : 'task:user:*',
      organizationId ? `tasks:grouped:org:${organizationId}:*` : 'tasks:grouped:*',
      organizationId ? `tasks:timeline:org:${organizationId}:*` : 'tasks:timeline:*',
      organizationId ? `task:stats:org:${organizationId}:*` : 'task:stats:*',
    ]
    if (includeMetadata) {
      patterns.push(
        organizationId
          ? taskMetadataCacheInvalidationPattern(organizationId)
          : 'task:metadata:*'
      )
    }

    await Promise.all(patterns.map((pattern) => this.store.deleteByPattern(pattern)))
  }
}
