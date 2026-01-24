export interface ProjectWorkspaceOption {
  id: string
  name: string
}

export interface ProjectWorkspaceAccessInput {
  organizationId: string
  userId: string
}

export abstract class ProjectWorkspaceAccessReader {
  abstract canEnter(input: ProjectWorkspaceAccessInput & { projectId: string }): Promise<boolean>

  abstract listEnterableByOrganization(
    input: ProjectWorkspaceAccessInput & {
      organizationProjectAccessGranted?: boolean
    }
  ): Promise<ProjectWorkspaceOption[]>
}
