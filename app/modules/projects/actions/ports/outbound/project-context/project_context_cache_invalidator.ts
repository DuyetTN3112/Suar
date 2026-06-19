export interface ProjectContextCacheInvalidator {
  invalidateResolvedTaskContext(projectId: string, versionToken: string): Promise<void>
}
