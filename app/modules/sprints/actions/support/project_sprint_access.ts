import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import type { ProjectSprintAccess } from '#modules/sprints/actions/ports/sprint_external_dependencies'

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
