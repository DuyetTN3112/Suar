
export interface ProjectCachePort {
  invalidateProject(projectId: string): Promise<void>
}
