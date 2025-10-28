import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'

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

export interface SprintProjectAccessReader {
  resolveProjectSprintAccess(
    execCtx: SprintActionContext,
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<ProjectSprintAccess>
}

export interface SprintExternalDependencies {
  projectAccess: SprintProjectAccessReader
}
