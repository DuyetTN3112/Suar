import type { DatabaseId } from '#types/database'

export interface TaskCachePort {
  invalidateOnTaskCreate(): Promise<void>
  invalidateOnTaskUpdate(taskId: DatabaseId): Promise<void>
}
