import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ProjectRepository from '#infra/projects/repositories/project_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import type { DatabaseId } from '#types/database'

import type {
  DebugUserOrganizationsInfo,
  OrganizationExternalDependencies,
  OrganizationOwnerName,
  OrganizationProjectTaskReaderWriter,
  OrganizationUserIdentity,
  OrganizationUserReaderWriter,
} from './organization_external_dependencies.js'

export class InfraOrganizationUserReaderWriter implements OrganizationUserReaderWriter {
  async findOwnerNamesByIds(
    userIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<OrganizationOwnerName[]> {
    const users = await UserRepository.findByIds(userIds, ['id', 'username'], trx)
    return users.map((user) => ({
      id: user.id,
      username: user.username,
    }))
  }

  async findUserIdentity(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<OrganizationUserIdentity | null> {
    const user = await UserRepository.findById(userId, trx)
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
    const user = await UserRepository.findByEmail(email, trx)
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

  async isActiveUser(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    return UserRepository.isActive(userId, trx)
  }

  async updateCurrentOrganization(
    userId: DatabaseId,
    organizationId: DatabaseId | null,
    trx?: TransactionClientContract
  ): Promise<void> {
    await UserRepository.updateCurrentOrganization(userId, organizationId, trx)
  }

  async loadDebugOrganizations(userId: DatabaseId): Promise<DebugUserOrganizationsInfo> {
    const user = await UserRepository.findWithOrganizations(userId)

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
    organizationIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return ProjectRepository.countByOrgIds(organizationIds, trx)
  }

  async countTasksByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    return ProjectRepository.countTasksByOrganization(organizationId, trx)
  }

  async unassignMemberTasks(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    const projectIds = await ProjectRepository.findIdsByOrganization(organizationId, trx)
    if (projectIds.length === 0) {
      return
    }

    await TaskRepository.unassignByUserInProjects(projectIds, userId, trx)
  }
}

export const DefaultOrganizationDependencies: OrganizationExternalDependencies = {
  user: new InfraOrganizationUserReaderWriter(),
  projectTask: new InfraOrganizationProjectTaskReaderWriter(),
}
