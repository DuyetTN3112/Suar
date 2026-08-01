export interface TaskCachePort {
  invalidateAfterTaskCreated(organizationId?: string): Promise<void>
  invalidateAfterTaskCollectionMetadataChanged(organizationId?: string): Promise<void>
  invalidateAfterTaskUpdated(taskId: string, organizationId?: string): Promise<void>
  invalidateAfterTaskDeleted(taskId: string, organizationId?: string): Promise<void>
  invalidateAfterTaskAssigned(taskId: string, organizationId?: string): Promise<void>
  invalidateAfterTaskAccessChanged(taskId: string, organizationId?: string): Promise<void>
  invalidateAfterTaskApplicationChanged(
    taskId: string,
    organizationId?: string,
    applicantId?: string
  ): Promise<void>
  invalidateTaskScopedCaches(taskId: string): Promise<void>
}
