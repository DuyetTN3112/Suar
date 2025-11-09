import type { TransactionClientContract } from '@adonisjs/lucid/types/database'


export interface ProjectActorInfo {
  id: string
  username: string
  system_role: string
}

export interface ProjectTaskPreview {
  id: string
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
    organizationId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<string | null>

  ensureApprovedMember(
    organizationId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<void>

  isApprovedMember(
    organizationId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<boolean>
}

export interface ProjectTaskReaderWriter {
  countByAssignees(
    projectId: string,
    userIds?: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>>

  countByProjectIds(
    projectIds: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>>

  countIncompleteByProject(
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<number>

  getSummaryByProject(projectId: string): Promise<ProjectTaskSummary>

  listPreviewByProject(projectId: string, limit: number): Promise<ProjectTaskPreview[]>

  reassignByUser(
    projectId: string,
    fromUserId: string,
    toUserId: string,
    trx?: TransactionClientContract
  ): Promise<void>
}

export interface ProjectUserReader {
  getSystemRoleName(userId: string, trx?: TransactionClientContract): Promise<string | null>

  findActorInfo(userId: string, trx?: TransactionClientContract): Promise<ProjectActorInfo>
}

export interface ProjectPermissionReader {
  checkOrgPermission(
    userId: string,
    organizationId: string,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean>

  isSystemSuperadmin(userId: string, trx?: TransactionClientContract): Promise<boolean>
}

export interface ProjectExternalDependencies {
  organization: ProjectOrganizationReader
  task: ProjectTaskReaderWriter
  user: ProjectUserReader
  permission: ProjectPermissionReader
}
