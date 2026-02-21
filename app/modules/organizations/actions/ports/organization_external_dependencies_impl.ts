import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  DebugUserOrganizationsInfo,
  OrganizationExternalDependencies,
  OrganizationOwnerName,
  OrganizationProjectTaskReaderWriter,
  OrganizationUserIdentity,
  OrganizationUserReaderWriter,
} from './organization_external_dependencies.js'

import { projectPublicApi } from '#modules/projects/public_contracts/project_public_api'
import { taskPublicApi } from '#modules/tasks/public_contracts/task_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'


export class InfraOrganizationUserReaderWriter implements OrganizationUserReaderWriter {
  async findOwnerNamesByIds(
    userIds: string[],
    trx?: TransactionClientContract
  ): Promise<OrganizationOwnerName[]> {
    const users = await userPublicApi.findByIds(userIds, ['id', 'username'], trx)
    return users.map((user) => ({
      id: user.id,
      username: user.username,
    }))
  }

  async findUserIdentity(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<OrganizationUserIdentity | null> {
    const user = await userPublicApi.findById(userId, trx)
    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      current_organization_id: user.current_organization_id,
    }
  }

  async findUserByEmail(
    email: string,
    trx?: TransactionClientContract
  ): Promise<OrganizationUserIdentity | null> {
    const user = await userPublicApi.findByEmail(email, trx)
    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      current_organization_id: user.current_organization_id,
    }
  }

  async isActiveUser(userId: string, trx?: TransactionClientContract): Promise<boolean> {
    return userPublicApi.isActive(userId, trx)
  }

  async updateCurrentOrganization(
    userId: string,
    organizationId: string | null,
    trx?: TransactionClientContract
  ): Promise<void> {
    await userPublicApi.updateCurrentOrganization(userId, organizationId, trx)
  }

  async loadDebugOrganizations(userId: string): Promise<DebugUserOrganizationsInfo> {
    const user = await userPublicApi.findWithOrganizations(userId)

    return {
      id: user.id,
      username: user.username,
      currentOrganizationId: user.current_organization_id,
      organizations: user.organizations.map((organization) => organization.serialize()),
    }
  }
}

export class InfraOrganizationProjectTaskReaderWriter
  implements OrganizationProjectTaskReaderWriter
{
  async countProjectsByOrganizationIds(
    organizationIds: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return projectPublicApi.countByOrganizationIds(organizationIds, trx)
  }

  async countTasksByOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<number> {
    const projectIds = await projectPublicApi.findIdsByOrganization(organizationId, trx)
    const taskCounts = await taskPublicApi.countByProjectIds(projectIds, trx)

    let total = 0
    for (const count of taskCounts.values()) {
      total += count
    }

    return total
  }

  async unassignMemberTasks(
    organizationId: string,
    userId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    const projectIds = await projectPublicApi.findIdsByOrganization(organizationId, trx)
    if (projectIds.length === 0) {
      return
    }

    await taskPublicApi.unassignByUserInProjects(projectIds, userId, trx)
  }
}

export const DefaultOrganizationDependencies: OrganizationExternalDependencies = {
  user: new InfraOrganizationUserReaderWriter(),
  projectTask: new InfraOrganizationProjectTaskReaderWriter(),
}
