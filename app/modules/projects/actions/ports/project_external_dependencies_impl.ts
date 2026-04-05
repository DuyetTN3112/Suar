import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

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

import { crossModulePermissionChecker } from '#modules/authorization/public_contracts/permission_checker'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { taskPublicApi } from '#modules/tasks/public_contracts/task_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'


export class InfraProjectOrganizationReader implements ProjectOrganizationReader {
  async getMembershipRole(
    organizationId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const membership = await organizationPublicApi.getMembershipContext(
      organizationId,
      userId,
      trx,
      true
    )
    return membership?.role ?? null
  }

  async ensureApprovedMember(
    organizationId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    await organizationPublicApi.ensureApprovedMember(organizationId, userId, trx)
  }

  async isApprovedMember(
    organizationId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return organizationPublicApi.isApprovedMember(userId, organizationId, trx)
  }
}

export class InfraProjectTaskReaderWriter implements ProjectTaskReaderWriter {
  async countByAssignees(
    projectId: string,
    userIds?: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return taskPublicApi.countByAssignees(projectId, userIds, trx)
  }

  async countByProjectIds(
    projectIds: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return taskPublicApi.countByProjectIds(projectIds, trx)
  }

  async countIncompleteByProject(
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<number> {
    return taskPublicApi.countIncompleteByProject(projectId, trx)
  }

  async getSummaryByProject(projectId: string): Promise<ProjectTaskSummary> {
    return taskPublicApi.getSummaryByProject(projectId)
  }

  async listPreviewByProject(
    projectId: string,
    limit: number
  ): Promise<ProjectTaskPreview[]> {
    const tasks = await taskPublicApi.listPreviewByProject(projectId, limit)
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      task_status_id: task.task_status_id,
      priority: task.priority,
      assignee_name: task.assigned_to ? (task.assignee?.username ?? null) : null,
      due_date: task.due_date ?? null,
    }))
  }

  async reassignByUser(
    projectId: string,
    fromUserId: string,
    toUserId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    await taskPublicApi.reassignByUser(projectId, fromUserId, toUserId, trx)
  }
}

export class InfraProjectUserReader implements ProjectUserReader {
  async getSystemRoleName(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    return userPublicApi.getSystemRoleName(userId, trx)
  }

  async findActorInfo(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<ProjectActorInfo> {
    const user = await userPublicApi.findNotDeletedOrFail(userId, trx)
    return {
      id: user.id,
      username: user.username,
      system_role: user.system_role,
    }
  }

  async isActiveUser(userId: string, trx?: TransactionClientContract): Promise<boolean> {
    return userPublicApi.isActive(userId, trx)
  }
}

export class InfraProjectPermissionReader implements ProjectPermissionReader {
  async checkOrgPermission(
    userId: string,
    organizationId: string,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return crossModulePermissionChecker.checkOrgPermission(userId, organizationId, permission, trx)
  }

  async isSystemSuperadmin(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return userPublicApi.isSystemSuperadmin(userId, trx)
  }
}

export const DefaultProjectDependencies: ProjectExternalDependencies = {
  organization: new InfraProjectOrganizationReader(),
  task: new InfraProjectTaskReaderWriter(),
  user: new InfraProjectUserReader(),
  permission: new InfraProjectPermissionReader(),
}
