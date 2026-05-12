import type { TaskAuthoringCreateCoordinator } from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_create_coordinator'
import type { TaskActiveAssignmentReader } from '#modules/tasks/actions/ports/outbound/task_active_assignment_reader'
import type { TaskAssignmentContractRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskAssignmentRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_repository'
import type { TaskAuditTrailReader } from '#modules/tasks/actions/ports/outbound/task_audit_trail_reader'
import type { TaskCommandRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_command_repository_port'
import type { TaskCompletionReportRepository } from '#modules/tasks/actions/ports/outbound/task_completion_report_repository'
import type { TaskCompletionRepository } from '#modules/tasks/actions/ports/outbound/task_completion_repository'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
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
import type { TaskResolvedBriefReader } from '#modules/tasks/actions/ports/outbound/task_resolved_brief_reader'
import type { OrganizationTaskSearchCandidateReader } from '#modules/tasks/actions/ports/outbound/task_search_candidate_readers'
import type { TaskSearchProjectionInvalidationStager } from '#modules/tasks/actions/ports/outbound/task_search_projection_invalidation_stager'
import type { TaskSprintReader } from '#modules/tasks/actions/ports/outbound/task_sprint_reader'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskVersionWriter } from '#modules/tasks/actions/ports/outbound/task_version_writer'
import type { MetadataAssignmentProvider } from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'

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
  authoring?: TaskAuthoringCreateCoordinator
  resolvedBriefReader?: TaskResolvedBriefReader
  assignmentContract?: {
    repository: TaskAssignmentContractRepository
    hasher: TaskContractContentHasher
    identityFactory: { nextId(): string }
    clock: { nowIso(): string }
  }
  metadataAssignmentProvider?: MetadataAssignmentProvider
  factSourceReader: TaskFactSourceReader
  lifecycleRepository: TaskLifecycleRepository
  transactionRunner: TaskTransactionRunner
  sprintReader: TaskSprintReader
  assignmentRepository: TaskAssignmentRepository
  commandRepository: TaskCommandRepositoryPort
  versionWriter: TaskVersionWriter
  completionRepository: TaskCompletionRepository
  completionReportRepository?: TaskCompletionReportRepository
  searchProjectionInvalidation?: TaskSearchProjectionInvalidationStager
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
  authoring,
  resolvedBriefReader,
  assignmentContract,
  metadataAssignmentProvider,
  factSourceReader,
  lifecycleRepository,
  transactionRunner,
  sprintReader,
  assignmentRepository,
  commandRepository,
  versionWriter,
  completionRepository,
  completionReportRepository,
  searchProjectionInvalidation,
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
    ...(authoring ? { authoring } : {}),
    ...(resolvedBriefReader ? { resolvedBrief: resolvedBriefReader } : {}),
    ...(assignmentContract ? { assignmentContract } : {}),
    ...(metadataAssignmentProvider ? { metadataAssignmentProvider } : {}),
    lifecycle: lifecycleRepository,
    facts: factSourceReader,
    transactions: transactionRunner,
    sprint: sprintReader,
    assignments: assignmentRepository,
    taskCommands: commandRepository,
    versions: versionWriter,
    completion: completionRepository,
    ...(completionReportRepository ? { completionReports: completionReportRepository } : {}),
    ...(searchProjectionInvalidation ? { searchProjectionInvalidation } : {}),
  }
}
