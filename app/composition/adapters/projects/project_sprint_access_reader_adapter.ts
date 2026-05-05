import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type {
  SprintProjectAccessReader,
} from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintTransaction } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import type {
  ProjectSprintAccess,
  SprintProjectAccessRow,
} from '#modules/sprints/domain/project-sprint/project_sprint_access_policy'

const MANAGER_PROJECT_ROLES = new Set([
  'owner',
  'project_owner',
  'project_manager',
  'manager',
])

export class ProjectSprintAccessReaderAdapter implements SprintProjectAccessReader {
  async resolveProjectSprintAccess(
    execCtx: SprintActionContext,
    projectId: string,
    transaction?: SprintTransaction
  ): Promise<ProjectSprintAccess> {
    if (!execCtx.userId) {
      throw new UnauthorizedException()
    }

    const actorId = execCtx.userId
    const reader = (transaction as TransactionClientContract | undefined) ?? db
    const project = (await reader
      .from('projects as p')
      .leftJoin('project_members as pm', (join) => {
        join.on('pm.project_id', 'p.id').andOnVal('pm.user_id', actorId)
      })
      .where('p.id', projectId)
      .whereNull('p.deleted_at')
      .select('p.id', 'p.organization_id', 'p.owner_id', 'p.manager_id', 'pm.project_role')
      .first()) as SprintProjectAccessRow | undefined

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    if (execCtx.organizationId && project.organization_id !== execCtx.organizationId) {
      throw new ForbiddenException('Project is outside current organization')
    }

    const canManageSprint =
      actorId === project.owner_id ||
      actorId === project.manager_id ||
      (project.project_role !== null && MANAGER_PROJECT_ROLES.has(project.project_role))
    const isProjectParticipant = canManageSprint || project.project_role !== null

    return {
      actorId,
      project,
      canManageSprint,
      isProjectParticipant,
    }
  }
}
