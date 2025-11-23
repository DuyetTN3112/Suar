import type { TransactionClientContract } from '@adonisjs/lucid/types/database'


export interface TaskProjectOption {
  id: string
  name: string
}

export interface TaskUserOption {
  id: string
  username: string
  email: string
}

export interface TaskUserIdentity {
  id: string
  username: string
  email: string | null
}

export interface TaskSkillOption {
  id: string
  name: string
}

export interface TaskProficiencyLevelOption {
  value: string
  label: string
}

export interface TaskOrgReader {
  ensureActiveOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<void>

  isApprovedMember(
    userId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<boolean>
}

export interface TaskProjectReader {
  ensureProjectBelongsToOrganization(
    projectId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<void>

  listProjectsByOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<TaskProjectOption[]>
}

export interface TaskUserReader {
  ensureActiveUser(userId: string, trx?: TransactionClientContract): Promise<void>

  findUserIdentity(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<TaskUserIdentity | null>

  isFreelancer(userId: string, trx?: TransactionClientContract): Promise<boolean>

  listUsersByOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<TaskUserOption[]>
}

export interface TaskReviewReader {
  hasAnyReviewForTask(taskId: string, trx?: TransactionClientContract): Promise<boolean>

  hasAnyReviewForTasksWithStatus(
    taskStatusId: string,
    trx?: TransactionClientContract
  ): Promise<boolean>
}

export interface TaskSkillReader {
  listActiveSkills(): Promise<TaskSkillOption[]>

  listActiveProficiencyLevels(): Promise<TaskProficiencyLevelOption[]>

  findActiveSkillIds(
    skillIds: string[],
    trx?: TransactionClientContract
  ): Promise<string[]>
}

export interface TaskPermissionReader {
  getSystemRoleName(userId: string, trx?: TransactionClientContract): Promise<string | null>

  getOrgRoleName(
    userId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<string | null>

  getProjectRoleName(
    userId: string,
    projectId: string,
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
