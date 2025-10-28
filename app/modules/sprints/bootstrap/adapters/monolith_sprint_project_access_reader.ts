import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type {
  ProjectSprintAccess,
  SprintProjectAccessReader,
  SprintProjectAccessRow,
} from '#modules/sprints/actions/ports/sprint_external_dependencies'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'

const MANAGER_PROJECT_ROLES = new Set([
  'owner',
  'project_owner',
  'project_manager',
  'manager',
])

export class MonolithSprintProjectAccessReader implements SprintProjectAccessReader {
  async resolveProjectSprintAccess(
    execCtx: SprintActionContext,
    projectId: string,
    trx: TransactionClientContract | typeof db = db
  ): Promise<ProjectSprintAccess> {
    if (!execCtx.userId) {
      throw new UnauthorizedException()
    }

    const actorId = execCtx.userId
    const project = (await trx
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
