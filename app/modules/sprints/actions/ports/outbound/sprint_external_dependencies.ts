import type { SprintTransaction } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import type { ProjectSprintAccess } from '#modules/sprints/domain/project_sprint_access_policy'

export interface SprintProjectAccessReader {
  resolveProjectSprintAccess(
    execCtx: SprintActionContext,
    projectId: string,
    trx?: SprintTransaction
  ): Promise<ProjectSprintAccess>
}

export interface SprintExternalDependencies {
  projectAccess: SprintProjectAccessReader
}
