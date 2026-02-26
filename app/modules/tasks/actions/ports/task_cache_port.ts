export interface TaskCachePort {
  invalidateAfterTaskCreated(): Promise<void>
  invalidateAfterTaskUpdated(taskId: string): Promise<void>
  invalidateAfterTaskDeleted(taskId: string): Promise<void>
  invalidateAfterTaskAssigned(taskId: string): Promise<void>
  invalidateAfterTaskAccessChanged(taskId: string): Promise<void>
  invalidateAfterTaskApplicationChanged(taskId: string): Promise<void>
  invalidateTaskDetail(taskId: string): Promise<void>
}
