import db from '@adonisjs/lucid/services/db'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/sprint_external_dependencies'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanReadProjectSprints } from '#modules/sprints/actions/support/project_sprint_access'
import { sprintExternalDeps } from '#modules/sprints/bootstrap/sprint_composition_root'
import type { ProjectSprintRecord } from '#modules/sprints/types/project_sprint_records'

export default class GetProjectSprintQuery {
  constructor(
    private readonly execCtx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies = sprintExternalDeps
  ) {}

  async handle(projectId: string, sprintId: string): Promise<ProjectSprintRecord> {
    const access = await this.externalDependencies.projectAccess.resolveProjectSprintAccess(
      this.execCtx,
      projectId
    )
    assertCanReadProjectSprints(access)

    const sprint = (await db
      .from('project_sprints')
      .where('id', sprintId)
      .where('project_id', projectId)
      .first()) as ProjectSprintRecord | undefined

    if (!sprint) {
      throw new NotFoundException('Project sprint not found')
    }

    return sprint
  }
}
