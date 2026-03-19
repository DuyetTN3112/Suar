import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintRepository } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanReadProjectSprints } from '#modules/sprints/domain/project_sprint_access_policy'
import type { ProjectSprintRecord } from '#modules/sprints/public_contracts/sprint_public_api'

export default class GetProjectSprintQuery {
  constructor(
    private readonly execCtx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies,
    private readonly sprints: SprintRepository
  ) {}

  async handle(projectId: string, sprintId: string): Promise<ProjectSprintRecord> {
    const access = await this.externalDependencies.projectAccess.resolveProjectSprintAccess(
      this.execCtx,
      projectId
    )
    assertCanReadProjectSprints(access)

    const sprint = await this.sprints.find(projectId, sprintId)

    if (!sprint) {
      throw new NotFoundException('Project sprint not found')
    }

    return sprint
  }
}
