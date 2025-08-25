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

import { crossModulePermissionChecker } from '#actions/authorization/public_api'
import { organizationPublicApi } from '#actions/organizations/public_api'
import { taskPublicApi } from '#actions/tasks/public_api'
import { userPublicApi } from '#actions/users/public_api'
import type { DatabaseId } from '#types/database'


export class InfraProjectOrganizationReader implements ProjectOrganizationReader {
  async getMembershipRole(
    organizationId: DatabaseId,
    userId: DatabaseId,
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
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await organizationPublicApi.ensureApprovedMember(organizationId, userId, trx)
  }

  async isApprovedMember(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return organizationPublicApi.isApprovedMember(userId, organizationId, trx)
  }
}

export class InfraProjectTaskReaderWriter implements ProjectTaskReaderWriter {
  async countByAssignees(
    projectId: DatabaseId,
    userIds?: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return taskPublicApi.countByAssignees(projectId, userIds, trx)
  }

  async countByProjectIds(
    projectIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return taskPublicApi.countByProjectIds(projectIds, trx)
  }

  async countIncompleteByProject(
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    return taskPublicApi.countIncompleteByProject(projectId, trx)
  }

  async getSummaryByProject(projectId: DatabaseId): Promise<ProjectTaskSummary> {
    return taskPublicApi.getSummaryByProject(projectId)
  }

  async listPreviewByProject(
    projectId: DatabaseId,
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
    projectId: DatabaseId,
    fromUserId: DatabaseId,
    toUserId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await taskPublicApi.reassignByUser(projectId, fromUserId, toUserId, trx)
  }
}

export class InfraProjectUserReader implements ProjectUserReader {
  async getSystemRoleName(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    return userPublicApi.getSystemRoleName(userId, trx)
  }

  async findActorInfo(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ProjectActorInfo> {
    const user = await userPublicApi.findNotDeletedOrFail(userId, trx)
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
    return crossModulePermissionChecker.checkOrgPermission(userId, organizationId, permission, trx)
  }

  async isSystemSuperadmin(
    userId: DatabaseId,
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
