import type { TaskActiveAssignmentReader } from '#modules/tasks/actions/ports/outbound/task_active_assignment_reader'
import type { TaskAssignmentRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_repository'
import type { TaskAuditTrailReader } from '#modules/tasks/actions/ports/outbound/task_audit_trail_reader'
import type { TaskCommandRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_command_repository_port'
import type { TaskCompletionRepository } from '#modules/tasks/actions/ports/outbound/task_completion_repository'
import type {
  TaskExternalDependencies,
  TaskOrgReader,
  TaskPermissionReader,
  TaskProjectReader,
  TaskReviewReader,
  TaskSkillReader,
  TaskUserReader,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskFactSourceReader } from '#modules/tasks/actions/ports/outbound/task_fact_source_reader'
import type { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import type { TaskIdentityQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_query_repository_port'
import type { TaskRequiredSkillResolver, TaskRequiredSkillWriter } from '#modules/tasks/actions/ports/outbound/task_required_skill_persistence'
import type { OrganizationTaskSearchCandidateReader } from '#modules/tasks/actions/ports/outbound/task_search_candidate_readers'
import type { TaskSprintReader } from '#modules/tasks/actions/ports/outbound/task_sprint_reader'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskVersionWriter } from '#modules/tasks/actions/ports/outbound/task_version_writer'

interface TaskExternalDependencyReaders {
  auditReader: TaskAuditTrailReader
  organizationTaskSearchCandidates: OrganizationTaskSearchCandidateReader
  organizationReader: TaskOrgReader
  permissionReader: TaskPermissionReader
  projectReader: TaskProjectReader
  reviewReader: TaskReviewReader
  skillReader: TaskSkillReader
  userReader: TaskUserReader
  requiredSkillPersistence?: {
    resolver: TaskRequiredSkillResolver
    writer: TaskRequiredSkillWriter
  }
  taskIdentityRepository?: TaskIdentityQueryRepositoryPort
  taskStatusRepository?: TaskStatusQueryRepositoryPort
  activeAssignmentReader?: TaskActiveAssignmentReader
  factSourceReader: TaskFactSourceReader
  lifecycleRepository: TaskLifecycleRepository
  transactionRunner: TaskTransactionRunner
  sprintReader: TaskSprintReader
  assignmentRepository: TaskAssignmentRepository
  commandRepository: TaskCommandRepositoryPort
  versionWriter: TaskVersionWriter
  completionRepository: TaskCompletionRepository
}

export function createTaskExternalDependencies({
  auditReader,
  organizationTaskSearchCandidates,
  organizationReader,
  permissionReader,
  projectReader,
  reviewReader,
  skillReader,
  userReader,
  requiredSkillPersistence,
  taskIdentityRepository,
  taskStatusRepository,
  activeAssignmentReader,
  factSourceReader,
  lifecycleRepository,
  transactionRunner,
  sprintReader,
  assignmentRepository,
  commandRepository,
  versionWriter,
  completionRepository,
}: TaskExternalDependencyReaders): TaskExternalDependencies {
  return {
    audit: auditReader,
    org: organizationReader,
    project: projectReader,
    user: userReader,
    review: reviewReader,
    skill: skillReader,
    permission: permissionReader,
    organizationTaskSearchCandidates,
    ...(requiredSkillPersistence ? { requiredSkillPersistence } : {}),
    ...(taskIdentityRepository ? { taskIdentityRepository } : {}),
    ...(taskStatusRepository ? { taskStatusRepository } : {}),
    ...(activeAssignmentReader ? { activeAssignmentReader } : {}),
    lifecycle: lifecycleRepository,
    facts: factSourceReader,
    transactions: transactionRunner,
    sprint: sprintReader,
    assignments: assignmentRepository,
    taskCommands: commandRepository,
    versions: versionWriter,
    completion: completionRepository,
  }
}
