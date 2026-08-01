export interface ProjectTaskCacheInvalidator {
  invalidateTaskCollectionMetadata(organizationId: string): Promise<void>
}
