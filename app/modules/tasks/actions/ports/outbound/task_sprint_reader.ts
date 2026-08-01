export interface TaskSprintSummary {
  id: string
  name: string
}

export interface TaskSprintReader {
  findSprint(
    projectId: string,
    sprintId: string
  ): Promise<TaskSprintSummary | null>

  belongsToProject(
    sprintId: string,
    organizationId: string,
    projectId: string
  ): Promise<boolean>
}
