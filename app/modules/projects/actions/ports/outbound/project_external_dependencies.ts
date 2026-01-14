import type { ProjectTransaction } from './project_transaction.js'
export interface ProjectActorInfo {
  id: string
  username: string
}

export interface ProjectUserIdentitySummary {
  id: string
  username: string
}

export interface ProjectTalentExplainabilitySummary {
  reviewedSkillsCount: number
  importedSkillsCount: number
  underDisputeSkillsCount: number
  latestConfidenceSignal: 'low' | 'medium' | 'high' | null
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

export interface ProjectOrganizationSummary {
  id: string
  name: string
  slug: string
  logo: string | null
}

export interface ProjectOwnedOrganizationOption {
  id: string
  name: string
}

export interface ProjectOrganizationUserOption {
  id: string
  username: string
  email: string | null
}

export abstract class ProjectOrganizationReader {
  abstract findOrganizationSummary(
    organizationId: string,
    transaction?: ProjectTransaction
  ): Promise<ProjectOrganizationSummary | null>

  abstract getMembershipRole(
    organizationId: string,
    userId: string,
    transaction?: ProjectTransaction
  ): Promise<string | null>

  abstract ensureApprovedMember(
    organizationId: string,
    userId: string,
    transaction?: ProjectTransaction
  ): Promise<void>

  abstract isApprovedMember(
    organizationId: string,
    userId: string,
    transaction?: ProjectTransaction
  ): Promise<boolean>

  abstract listOwnedOrganizations(userId: string): Promise<ProjectOwnedOrganizationOption[]>

  abstract listOrganizationUsers(
    organizationId: string,
    excludeUserId: string
  ): Promise<ProjectOrganizationUserOption[]>
}

export abstract class ProjectTaskReaderWriter {
  abstract countByAssignees(
    projectId: string,
    userIds?: string[],
    transaction?: ProjectTransaction
  ): Promise<Map<string, number>>

  abstract countByProjectIds(
    projectIds: string[],
    transaction?: ProjectTransaction
  ): Promise<Map<string, number>>

  abstract countIncompleteByProject(
    projectId: string,
    transaction?: ProjectTransaction
  ): Promise<number>

  abstract getSummaryByProject(projectId: string): Promise<ProjectTaskSummary>

  abstract listPreviewByProject(projectId: string, limit: number): Promise<ProjectTaskPreview[]>

  abstract reassignByUser(
    projectId: string,
    fromUserId: string,
    toUserId: string,
    transaction?: ProjectTransaction
  ): Promise<void>
}

export abstract class ProjectUserReader {
  abstract findActorInfo(userId: string, transaction?: ProjectTransaction): Promise<ProjectActorInfo>

  abstract findIdentitySummaries(
    userIds: string[],
    transaction?: ProjectTransaction
  ): Promise<ProjectUserIdentitySummary[]>

  abstract findTalentExplainabilitySummaries(
    userIds: string[]
  ): Promise<Map<string, ProjectTalentExplainabilitySummary>>

  abstract isActiveUser(userId: string, transaction?: ProjectTransaction): Promise<boolean>
}

export interface ProjectExternalDependencies {
  organization: ProjectOrganizationReader
  task: ProjectTaskReaderWriter
  user: ProjectUserReader
}
