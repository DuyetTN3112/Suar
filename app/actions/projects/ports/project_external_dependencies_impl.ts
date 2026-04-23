import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import * as PermissionService from '#services/permission_service'
import type { DatabaseId } from '#types/database'

import type {
  ProjectActorInfo,
  ProjectExternalDependencies,
  ProjectOrganizationReader,
  ProjectPermissionReader,
  ProjectTaskPreview,
  ProjectTaskReaderWriter,
  ProjectTaskSummary,
  ProjectUserReader,
} from './project_external_dependencies.js'

export class InfraProjectOrganizationReader implements ProjectOrganizationReader {
  async getMembershipRole(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const membership = await OrganizationUserRepository.getMembershipContext(
      organizationId,
      userId,
      trx,
      true
    )
    return membership?.role ?? null
  }

  async ensureApprovedMember(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await OrganizationUserRepository.findApprovedMemberOrFail(organizationId, userId, trx)
  }

  async isApprovedMember(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return OrganizationUserRepository.isApprovedMember(userId, organizationId, trx)
  }
}

export class InfraProjectTaskReaderWriter implements ProjectTaskReaderWriter {
  async countByAssignees(
    projectId: DatabaseId,
    userIds?: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return TaskRepository.countByAssignees(projectId, userIds, trx)
  }

  async countByProjectIds(
    projectIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return TaskRepository.countByProjectIds(projectIds, trx)
  }

  async countIncompleteByProject(
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    return TaskRepository.countIncompleteByProject(projectId, trx)
  }

  async getSummaryByProject(projectId: DatabaseId): Promise<ProjectTaskSummary> {
    return TaskRepository.getTasksSummaryByProject(projectId)
  }

  async listPreviewByProject(
    projectId: DatabaseId,
    limit: number
  ): Promise<ProjectTaskPreview[]> {
    const tasks = await TaskRepository.listPreviewByProject(projectId, limit)
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      task_status_id: task.task_status_id,
      priority: task.priority,
      assignee_name: task.assigned_to ? task.assignee.username : null,
      due_date: task.due_date ? task.due_date.toISO() : null,
    }))
  }

  async reassignByUser(
    projectId: DatabaseId,
    fromUserId: DatabaseId,
    toUserId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await TaskRepository.reassignByUser(projectId, fromUserId, toUserId, trx)
  }
}

export class InfraProjectUserReader implements ProjectUserReader {
  async getSystemRoleName(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    return UserRepository.getSystemRoleName(userId, trx)
  }

  async findActorInfo(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ProjectActorInfo> {
    const user = await UserRepository.findNotDeletedOrFail(userId, trx)
    return {
      id: user.id,
      username: user.username,
      system_role: user.system_role,
    }
  }
}

export class InfraProjectPermissionReader implements ProjectPermissionReader {
  async checkOrgPermission(
    userId: DatabaseId,
    organizationId: DatabaseId,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return PermissionService.checkOrgPermission(userId, organizationId, permission, trx)
  }

  async isSystemSuperadmin(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return PermissionService.isSystemSuperadmin(userId, trx)
  }
}

export const DefaultProjectDependencies: ProjectExternalDependencies = {
  organization: new InfraProjectOrganizationReader(),
  task: new InfraProjectTaskReaderWriter(),
  user: new InfraProjectUserReader(),
  permission: new InfraProjectPermissionReader(),
}
