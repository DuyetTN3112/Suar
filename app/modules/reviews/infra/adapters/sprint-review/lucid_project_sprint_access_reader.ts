import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

const MANAGER_PROJECT_ROLES = new Set(['owner', 'project_owner', 'project_manager', 'manager'])

interface ProjectAccessRow {
  id: string
  organization_id: string
  owner_id: string | null
  manager_id: string | null
  project_role: string | null
}

export interface ProjectSprintAccess {
  actorId: string
  project: ProjectAccessRow
  canManageSprint: boolean
  isProjectParticipant: boolean
}

export async function resolveProjectSprintAccess(
  execCtx: ReviewActionContext,
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
    .first()) as ProjectAccessRow | undefined

  if (!project) {
    throw new NotFoundException('Project not found')
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
