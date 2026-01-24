import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'

export interface SprintProjectAccessRow {
  id: string
  organization_id: string
  owner_id: string | null
  manager_id: string | null
  project_role: string | null
}

export interface ProjectSprintAccess {
  actorId: string
  project: SprintProjectAccessRow
  canManageSprint: boolean
  isProjectParticipant: boolean
}

export function assertCanReadProjectSprints(access: ProjectSprintAccess): void {
  if (!access.isProjectParticipant) {
    throw new ForbiddenException('Actor cannot read project sprints')
  }
}

export function assertCanManageProjectSprints(access: ProjectSprintAccess): void {
  if (!access.canManageSprint) {
    throw new ForbiddenException('Actor cannot manage project sprint')
  }
}
