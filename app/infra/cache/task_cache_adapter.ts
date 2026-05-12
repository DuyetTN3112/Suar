import CacheService from './cache_service.js'

import type { DatabaseId } from '#types/database'


export const taskCacheAdapter = {
  async invalidateOnTaskCreate(): Promise<void> {
    await CacheService.deleteByPattern('organization:tasks:*')
    await CacheService.deleteByPattern('tasks:public:*')
    await CacheService.deleteByPattern('task:user:*')
  },

  async invalidateOnTaskUpdate(taskId: DatabaseId): Promise<void> {
    await CacheService.deleteByPattern(`task:${taskId}:*`)
    await CacheService.deleteByPattern('organization:tasks:*')
    await CacheService.deleteByPattern('task:user:*')
  },
}
