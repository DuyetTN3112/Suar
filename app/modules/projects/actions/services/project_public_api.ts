import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import CreateProjectCommand from '../commands/create_project_command.js'
import type { CreateProjectDTO } from '../dtos/request/create_project_dto.js'
import type { ProjectCachePort } from '../ports/project_cache_port.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { DefaultProjectDependencies } from '#modules/projects/actions/ports/project_external_dependencies_impl'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { canUpdateProject, canViewProject } from '#modules/projects/domain/project_permission_policy'
import { ProjectCacheInvalidator } from '#modules/projects/infra/cache/project_cache_invalidator'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'


export class ProjectPublicApi {
  constructor(private readonly cache: ProjectCachePort) {}

  async ensureBelongsToOrganization(
    projectId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    await projectModelQueries.validateBelongsToOrg(projectId, organizationId, trx)
  }

  async listSimpleByOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ) {
    return projectModelQueries.listSimpleByOrganization(organizationId, trx)
  }

  async countByOrganizationIds(
    organizationIds: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return projectModelQueries.countByOrgIds(organizationIds, trx)
  }

  async countActiveByOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<number> {
    const counts = await projectModelQueries.countByOrgIds([organizationId], trx)
    return counts.get(organizationId) ?? 0
  }

  async getMembershipContext(
    projectId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<{ project_role: string } | null> {
    const membership = await projectMemberQueries.findMember(projectId, userId, trx)
    if (!membership) {
      return null
    }

    return {
      project_role: membership.project_role,
    }
  }

  async enforceUserProjectAccess(params: {
    projectId: string
    userId: string
    organizationId: string
    writeMode?: boolean
  }): Promise<void> {
    const project = await projectModelQueries.findDetailWithRelationsRecord(params.projectId)

    if (project.organization_id !== params.organizationId) {
      throw new BusinessLogicException(
        'Access denied: Project does not belong to your current organization'
      )
    }

    const [actorSystemRole, actorMembership, actorProjectRole] = await Promise.all([
      DefaultProjectDependencies.user.getSystemRoleName(params.userId),
      DefaultProjectDependencies.organization.getMembershipRole(params.organizationId, params.userId),
      projectMemberQueries.getRoleName(params.projectId, params.userId).then((role) =>
        role === 'unknown' ? null : role
      ),
    ])

    const permissionContext = {
      actorId: params.userId,
      actorSystemRole,
      actorOrgRole: actorMembership,
      actorProjectRole,
      projectCreatorId: project.creator_id,
      projectOwnerId: project.owner_id ?? '',
      projectOrganizationId: project.organization_id,
    }

    enforcePolicy(
      params.writeMode
        ? canUpdateProject(permissionContext)
        : canViewProject(permissionContext)
    )
  }

  async invalidatePermissionCache(projectId: string): Promise<void> {
    await this.cache.invalidateProject(projectId)
  }

  async findManagerOrOwnerIds(
    projectId: string,
    excludeUserId?: string,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    return projectMemberQueries.findManagerOrOwnerIds(projectId, excludeUserId, trx)
  }

  async findIdsByOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    return projectModelQueries.findIdsByOrganization(organizationId, trx)
  }

  async createProject(dto: CreateProjectDTO, execCtx: ProjectActionContext) {
    return new CreateProjectCommand(execCtx).handle(dto)
  }
}

export const projectPublicApi = new ProjectPublicApi(new ProjectCacheInvalidator())
