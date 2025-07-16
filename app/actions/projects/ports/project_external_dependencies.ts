import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { DatabaseId } from '#types/database'

export interface ProjectActorInfo {
  id: DatabaseId
  username: string
  system_role: string
}

export interface ProjectTaskPreview {
  id: DatabaseId
  title: string
  description: string | null
  status: string
  task_status_id: string | null
  priority: string | null
  assignee_name: string | null
  due_date: string | null
}

export interface ProjectTaskSummary {
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
}

export interface ProjectOrganizationReader {
  getMembershipRole(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null>

  ensureApprovedMember(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void>

  isApprovedMember(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean>
}

export interface ProjectTaskReaderWriter {
  countByAssignees(
    projectId: DatabaseId,
    userIds?: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>>

  countByProjectIds(
    projectIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>>

  countIncompleteByProject(
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number>

  getSummaryByProject(projectId: DatabaseId): Promise<ProjectTaskSummary>

  listPreviewByProject(projectId: DatabaseId, limit: number): Promise<ProjectTaskPreview[]>

  reassignByUser(
    projectId: DatabaseId,
    fromUserId: DatabaseId,
    toUserId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void>
}

export interface ProjectUserReader {
  getSystemRoleName(userId: DatabaseId, trx?: TransactionClientContract): Promise<string | null>

  findActorInfo(userId: DatabaseId, trx?: TransactionClientContract): Promise<ProjectActorInfo>
}

export interface ProjectPermissionReader {
  checkOrgPermission(
    userId: DatabaseId,
    organizationId: DatabaseId,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean>

  isSystemSuperadmin(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean>
}

export interface ProjectExternalDependencies {
  organization: ProjectOrganizationReader
  task: ProjectTaskReaderWriter
  user: ProjectUserReader
  permission: ProjectPermissionReader
}
