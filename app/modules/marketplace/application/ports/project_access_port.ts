export interface ProjectAccessPort {
  /**
   * Checks if a specific user has permission to view tasks of a project
   * in the marketplace context.
   */
  canViewProjectTasks(projectId: string, userId: string): Promise<boolean>
  canManageProjectTasks(projectId: string, userId: string): Promise<boolean>
}
