import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'

export class TaskCacheInvalidator implements TaskCachePort {
  async invalidateAfterTaskCreated(): Promise<void> {
    await cacheStore.deleteByPattern('tasks:public:*')
    await cacheStore.deleteByPattern('task:user:*')
    await cacheStore.deleteByPattern('tasks:grouped:*')
    await cacheStore.deleteByPattern('tasks:timeline:*')
    await cacheStore.deleteByPattern('task:stats:*')
    await cacheStore.deleteByPattern('task:metadata:*')
  }

  async invalidateAfterTaskUpdated(taskId: string): Promise<void> {
    await this.invalidateTaskDetail(taskId)
    await cacheStore.deleteByPattern('task:user:*')
    await cacheStore.deleteByPattern('tasks:public:*')
    await cacheStore.deleteByPattern('tasks:grouped:*')
    await cacheStore.deleteByPattern('tasks:timeline:*')
    await cacheStore.deleteByPattern('task:stats:*')
  }

  async invalidateAfterTaskDeleted(taskId: string): Promise<void> {
    await this.invalidateAfterTaskUpdated(taskId)
    await cacheStore.deleteByPattern('task:applications:*')
  }

  async invalidateAfterTaskAssigned(taskId: string): Promise<void> {
    await this.invalidateTaskDetail(taskId)
    await cacheStore.deleteByPattern('task:user:*')
    await cacheStore.deleteByPattern('task:applications:*')
  }

  async invalidateAfterTaskAccessChanged(taskId: string): Promise<void> {
    await this.invalidateTaskDetail(taskId)
    await cacheStore.deleteByPattern('task:user:*')
  }

  async invalidateAfterTaskApplicationChanged(taskId: string): Promise<void> {
    await this.invalidateTaskDetail(taskId)
    await cacheStore.deleteByPattern('task:applications:*')
    await cacheStore.deleteByPattern('task:user:*')
  }

  async invalidateTaskDetail(taskId: string): Promise<void> {
    await cacheStore.deleteByPattern(`task:${taskId}:*`)
    await cacheStore.deleteByPattern(`task:audit:${taskId}:*`)
  }
}
