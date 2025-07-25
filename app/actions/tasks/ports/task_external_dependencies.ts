import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { DatabaseId } from '#types/database'

export interface TaskProjectOption {
  id: DatabaseId
  name: string
}

export interface TaskUserOption {
  id: DatabaseId
  username: string
  email: string
}

export interface TaskUserIdentity {
  id: DatabaseId
  username: string
  email: string | null
}

export interface TaskSkillOption {
  id: DatabaseId
  name: string
}

export interface TaskOrgReader {
  ensureActiveOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void>

  isApprovedMember(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean>
}

export interface TaskProjectReader {
  ensureProjectBelongsToOrganization(
    projectId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void>

  listProjectsByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskProjectOption[]>
}

export interface TaskUserReader {
  ensureActiveUser(userId: DatabaseId, trx?: TransactionClientContract): Promise<void>

  findUserIdentity(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskUserIdentity | null>

  isFreelancer(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean>

  listUsersByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskUserOption[]>
}

export interface TaskReviewReader {
  hasAnyReviewForTask(taskId: DatabaseId, trx?: TransactionClientContract): Promise<boolean>

  hasAnyReviewForTasksWithStatus(
    taskStatusId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean>
}

export interface TaskSkillReader {
  listActiveSkills(): Promise<TaskSkillOption[]>

  findActiveSkillIds(
    skillIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<DatabaseId[]>
}

export interface TaskPermissionReader {
  getSystemRoleName(userId: DatabaseId, trx?: TransactionClientContract): Promise<string | null>

  getOrgRoleName(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null>

  getProjectRoleName(
    userId: DatabaseId,
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null>
}

export interface TaskExternalDependencies {
  org: TaskOrgReader
  project: TaskProjectReader
  user: TaskUserReader
  review: TaskReviewReader
  skill: TaskSkillReader
  permission: TaskPermissionReader
}
