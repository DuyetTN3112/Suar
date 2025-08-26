import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import CreateProjectCommand from '../commands/create_project_command.js'
import type { CreateProjectDTO } from '../dtos/request/create_project_dto.js'
import type { ProjectCachePort } from '../ports/project_cache_port.js'

import { projectCacheAdapter } from '#infra/cache/project_cache_adapter'
import * as projectMemberQueries from '#infra/projects/repositories/read/project_member_queries'
import * as projectModelQueries from '#infra/projects/repositories/read/project_model_queries'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'


export class ProjectPublicApi {
  constructor(private readonly cache: ProjectCachePort = projectCacheAdapter) {}

  async ensureBelongsToOrganization(
    projectId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await projectModelQueries.validateBelongsToOrg(projectId, organizationId, trx)
  }

  async listSimpleByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    return projectModelQueries.listSimpleByOrganization(organizationId, trx)
  }

  async countByOrganizationIds(
    organizationIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return projectModelQueries.countByOrgIds(organizationIds, trx)
  }

  async countActiveByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const counts = await projectModelQueries.countByOrgIds([organizationId], trx)
    return counts.get(organizationId) ?? 0
  }

  async getMembershipContext(
    projectId: DatabaseId,
    userId: DatabaseId,
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

  async invalidatePermissionCache(projectId: DatabaseId): Promise<void> {
    await this.cache.invalidateProject(projectId)
  }

  async findManagerOrOwnerIds(
    projectId: DatabaseId,
    excludeUserId?: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<DatabaseId[]> {
    return projectMemberQueries.findManagerOrOwnerIds(projectId, excludeUserId, trx)
  }

  async findIdsByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<DatabaseId[]> {
    return projectModelQueries.findIdsByOrganization(organizationId, trx)
  }

  async createProject(dto: CreateProjectDTO, execCtx: ExecutionContext) {
    return new CreateProjectCommand(execCtx).handle(dto)
  }
}

export const projectPublicApi = new ProjectPublicApi()
