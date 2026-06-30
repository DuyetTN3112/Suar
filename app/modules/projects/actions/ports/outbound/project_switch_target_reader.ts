export interface ProjectSwitchTarget {
  id: string
  name: string
  organizationId: string
}

export abstract class ProjectSwitchTargetReader {
  abstract find(projectId: string, userId: string): Promise<ProjectSwitchTarget>
}
