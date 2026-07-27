import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseQuery } from '#modules/sprints/actions/base_query'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintRepository } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanReadProjectSprints } from '#modules/sprints/domain/project-sprint/project_sprint_access_policy'
import type { ProjectSprintRecord } from '#modules/sprints/public_contracts/sprint_public_api'

export default class GetProjectSprintQuery extends BaseQuery<
  [projectId: string, sprintId: string],
  ProjectSprintRecord
> {
  constructor(
    private readonly execCtx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies,
    private readonly sprints: SprintRepository
  ) {
    super()
  }

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

  override async execute(projectId: string, sprintId: string): Promise<ProjectSprintRecord> {
    return this.handle(projectId, sprintId)
  }
}
