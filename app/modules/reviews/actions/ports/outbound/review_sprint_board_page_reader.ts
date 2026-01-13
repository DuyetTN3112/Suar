export interface SprintReviewWindow {
  sprintId: string
  sprintName: string
  projectId: string
  projectName: string
  activeSprintId: string | null
  activeSprintName: string | null
  reviewOpenedAt: string | null
}

export interface ReviewProjectAccessFacts {
  project: {
    id: string
    name: string
    organizationId: string
    ownerId: string | null
    managerId: string | null
    creatorId: string | null
  } | null
  isProjectMember: boolean
  isOrganizationAdministrator: boolean
}

export interface ReviewSprintBoardPageReader {
  loadProjectAccessFacts(projectId: string, actorId: string): Promise<ReviewProjectAccessFacts>

  loadSprintReviewWindow(input: {
    actorId: string
    organizationId: string | null
    projectId: string
    sprintId: string | null
  }): Promise<SprintReviewWindow | null>
}
