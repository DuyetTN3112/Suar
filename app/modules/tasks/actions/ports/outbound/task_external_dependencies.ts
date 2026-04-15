import type { TaskActiveAssignmentReader } from './task_active_assignment_reader.js'
import type { TaskAssignmentRepository } from './task_assignment_repository.js'
import type { TaskAuditTrailReader } from './task_audit_trail_reader.js'
import type { TaskCommandRepositoryPort } from './task_command_repository_port.js'
import type { TaskCompletionRepository } from './task_completion_repository.js'
import type { TaskFactSourceReader } from './task_fact_source_reader.js'
import type { TaskLifecycleRepository } from './task_lifecycle_repository.js'
import type { TaskIdentityQueryRepositoryPort } from './task_query_repository_port.js'
import type {
  TaskRequiredSkillResolver,
  TaskRequiredSkillWriter,
} from './task_required_skill_persistence.js'
import type { OrganizationTaskSearchCandidateReader } from './task_search_candidate_readers.js'
import type { TaskSprintReader } from './task_sprint_reader.js'
import type { TaskStatusQueryRepositoryPort } from './task_status_query_repository_port.js'
import type { TaskTransaction, TaskTransactionRunner  } from './task_transaction.js'
import type { TaskVersionWriter } from './task_version_writer.js'

export interface TaskProjectOption {
  id: string
  name: string
}

export interface TaskProjectSummary {
  id: string
  name: string
  ownerId: string | null
}

export interface TaskUserOption {
  id: string
  username: string
  email: string
  avatar_url?: string | null
}

export interface TaskUserIdentity {
  id: string
  username: string
  email: string | null
}

export interface TaskTalentExplainabilitySummary {
  reviewedSkillsCount: number
  importedSkillsCount: number
  underDisputeSkillsCount: number
  latestConfidenceSignal: 'low' | 'medium' | 'high' | null
}

export interface TaskSkillOption {
  id: string
  name: string
  category_code?: string | null
}

export interface TaskSkillSummary {
  skillId: string
  skillName: string
}

export interface TaskProjectSkillOption {
  id: string
  name: string
  categoryCode: string | null
  rubricVersionId: string | null
  isActive: boolean
  isSelectableForTasks: boolean
}

export interface TaskProficiencyLevelDetail {
  id: string
  code: string
  ordinal: number
  scaleId: string
}

export interface TaskProjectRoleSkill {
  id: string
  projectSkillId: string
  skillId: string
  skillName: string
  categoryCode: string
  minimumLevelId: string | null
  targetLevelId: string | null
  assessmentCeilingLevelId: string | null
  isMandatory: boolean
  importance: 'low' | 'medium' | 'high' | 'critical'
  weight: number
  notes: string | null
}

export interface TaskProjectRole {
  id: string
  projectId: string
  name: string
  isActive: boolean
  roleSkills: TaskProjectRoleSkill[]
}

export interface TaskRequirementSkillReference {
  id: string
  name: string
  code: string
  categoryCode: string
  iconUrl: string | null
}

export interface TaskRequirementProficiencyLevelReference {
  id: string
  code: string
  displayName: string
  shortName: string | null
  ordinal: number
}

export interface TaskRequirementReferenceFacts {
  skills: TaskRequirementSkillReference[]
  proficiencyLevels: TaskRequirementProficiencyLevelReference[]
}

export interface TaskProficiencyLevelOption {
  value: string
  label: string
}

export interface TaskOrganizationSummary {
  id: string
  name: string
  logo: string | null
}

export interface TaskOrgReader {
  ensureActiveOrganization(organizationId: string, trx?: TaskTransaction): Promise<void>

  findOrganizationSummaries(
    organizationIds: string[],
    trx?: TaskTransaction
  ): Promise<TaskOrganizationSummary[]>

  isApprovedMember(
    userId: string,
    organizationId: string,
    trx?: TaskTransaction
  ): Promise<boolean>
}

export interface TaskProjectReader {
  ensureProjectBelongsToOrganization(
    projectId: string,
    organizationId: string,
    trx?: TaskTransaction
  ): Promise<void>

  listProjectsByOrganization(
    organizationId: string,
    trx?: TaskTransaction
  ): Promise<TaskProjectOption[]>

  findProjectSummaries(
    projectIds: string[],
    trx?: TaskTransaction
  ): Promise<TaskProjectSummary[]>
}

export interface TaskUserReader {
  ensureActiveUser(userId: string, trx?: TaskTransaction): Promise<void>

  findUserIdentity(
    userId: string,
    trx?: TaskTransaction
  ): Promise<TaskUserIdentity | null>

  findUserIdentities(
    userIds: string[],
    trx?: TaskTransaction
  ): Promise<TaskUserIdentity[]>

  isExternalContributor(userId: string, trx?: TaskTransaction): Promise<boolean>

  listUsersByOrganization(
    organizationId: string,
    trx?: TaskTransaction
  ): Promise<TaskUserOption[]>

  getTalentExplainabilitySummaries(
    userIds: string[]
  ): Promise<Map<string, TaskTalentExplainabilitySummary>>
}

export interface TaskReviewReader {
  hasAnyReviewForTask(taskId: string, trx?: TaskTransaction): Promise<boolean>

  hasAnyReviewForTasksWithStatus(
    taskStatusId: string,
    trx?: TaskTransaction
  ): Promise<boolean>

  getTaskReviewDetail(taskId: string): Promise<Record<string, unknown> | null>

  getTaskReviewZoneSummary(taskId: string): Promise<TaskReviewZoneSummary | null>

  hasTaskReviewWorkflow(
    taskId: string,
    trx?: TaskTransaction
  ): Promise<boolean>

  ensureTaskReviewWorkflow(
    taskId: string,
    changedBy: string,
    trx: TaskTransaction
  ): Promise<void>
}

export interface TaskReviewZoneSummary {
  submission_id: string | null
  submission_status: string | null
  review_session_id: string | null
  review_session_status: string | null
  dispute_id: string | null
  dispute_status: string | null
  creator_review_completed: boolean | null
  manager_reviews_count: number
  peer_reviews_count: number
  required_total_reviews: number | null
  required_peer_reviews: number | null
  required_pending_assignments: number
  optional_pending_assignments: number
}

export abstract class TaskSkillReader {
  abstract listActiveSkills(): Promise<TaskSkillOption[]>

  abstract listProjectTaskSkills(projectId: string): Promise<TaskProjectSkillOption[]>

  abstract listActiveProficiencyLevels(): Promise<TaskProficiencyLevelOption[]>

  abstract findActiveSkillIds(
    skillIds: string[],
    trx?: TaskTransaction
  ): Promise<string[]>

  abstract findSkillSummariesByIds(
    skillIds: string[],
    trx?: TaskTransaction
  ): Promise<TaskSkillSummary[]>

  abstract resolveSkillIdsByCategoryCodes(categoryCodes: string[]): Promise<string[]>

  abstract findTaskRequirementReferenceFacts(
    ids: {
      skillIds: string[]
      proficiencyLevelIds: string[]
    },
    trx?: TaskTransaction
  ): Promise<TaskRequirementReferenceFacts>

  abstract findProficiencyLevelsByIds(ids: string[]): Promise<TaskProficiencyLevelDetail[]>

  abstract findProficiencyLevelById(id: string): Promise<TaskProficiencyLevelDetail | null>

  abstract findRubricVersion(
    rubricVersionId: string
  ): Promise<{ id: string; skillId: string } | null>

  abstract findProjectRole(roleId: string): Promise<TaskProjectRole | null>
}

export interface TaskPermissionReader {
  getOrgRoleName(
    userId: string,
    organizationId: string,
    trx?: TaskTransaction
  ): Promise<string | null>

  getProjectRoleName(
    userId: string,
    projectId: string,
    trx?: TaskTransaction
  ): Promise<string | null>
}

export interface TaskExternalDependencies {
  audit: TaskAuditTrailReader
  org: TaskOrgReader
  project: TaskProjectReader
  user: TaskUserReader
  review: TaskReviewReader
  skill: TaskSkillReader
  permission: TaskPermissionReader
  organizationTaskSearchCandidates: OrganizationTaskSearchCandidateReader
  requiredSkillPersistence?: {
    resolver: TaskRequiredSkillResolver
    writer: TaskRequiredSkillWriter
  }
  taskIdentityRepository?: TaskIdentityQueryRepositoryPort
  taskStatusRepository?: TaskStatusQueryRepositoryPort
  activeAssignmentReader?: TaskActiveAssignmentReader
  lifecycle: TaskLifecycleRepository
  facts: TaskFactSourceReader
  transactions: TaskTransactionRunner
  sprint: TaskSprintReader
  assignments: TaskAssignmentRepository
  taskCommands: TaskCommandRepositoryPort
  versions: TaskVersionWriter
  completion: TaskCompletionRepository
}
