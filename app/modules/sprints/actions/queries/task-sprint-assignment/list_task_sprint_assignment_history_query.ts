import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseQuery } from '#modules/sprints/actions/base_query'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintRepository } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanReadProjectSprints } from '#modules/sprints/domain/project-sprint/project_sprint_access_policy'
import type { ProjectSprintAssignmentHistoryRecord } from '#modules/sprints/public_contracts/task-sprint-assignment/project_sprint_assignment_history'

export default class ListTaskSprintAssignmentHistoryQuery extends BaseQuery<
  [projectId: string, taskId: string],
  ProjectSprintAssignmentHistoryRecord[]
> {
  constructor(
    private readonly ctx: SprintActionContext,
    private readonly dependencies: SprintExternalDependencies,
    private readonly sprints: SprintRepository
  ) {
    super()
  }

  async handle(projectId: string, taskId: string): Promise<ProjectSprintAssignmentHistoryRecord[]> {
    const access = await this.dependencies.projectAccess.resolveProjectSprintAccess(this.ctx, projectId)
    assertCanReadProjectSprints(access)
    const history = await this.sprints.listTaskAssignmentHistory(projectId, taskId)
    if (history.length === 0) throw new NotFoundException('Task sprint assignment history not found')
    return history
  }

  override async execute(
    projectId: string,
    taskId: string
  ): Promise<ProjectSprintAssignmentHistoryRecord[]> {
    return this.handle(projectId, taskId)
  }
}
