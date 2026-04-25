import { randomUUID } from 'node:crypto'

import { DateTime } from 'luxon'

import { TaskActiveAssignmentReaderAdapter } from '#composition/adapters/tasks/task_active_assignment_reader_adapter'
import { TaskAuditTrailReaderAdapter } from '#composition/adapters/tasks/task_audit_trail_reader_adapter'
import { TaskOrganizationReaderAdapter } from '#composition/adapters/tasks/task_organization_reader_adapter'
import { TaskPermissionReaderAdapter } from '#composition/adapters/tasks/task_permission_reader_adapter'
import { TaskProjectReaderAdapter } from '#composition/adapters/tasks/task_project_reader_adapter'
import {
  TaskRequiredSkillResolverAdapter,
  TaskRequiredSkillWriterAdapter,
} from '#composition/adapters/tasks/task_required_skill_persistence_adapter'
import { TaskReviewReaderAdapter } from '#composition/adapters/tasks/task_review_reader_adapter'
import { TaskSkillReaderAdapter } from '#composition/adapters/tasks/task_skill_reader_adapter'
import { TaskSprintReaderAdapter } from '#composition/adapters/tasks/task_sprint_reader_adapter'
import { TaskUserReaderAdapter } from '#composition/adapters/tasks/task_user_reader_adapter'
import { createTaskExternalDependencies } from '#composition/tasks/task-authoring/create_task_external_dependencies'
import { taskMetadataAssignmentProvider } from '#composition/tasks/task-metadata/task_metadata_assignment_composition'
import { LucidTaskAuthoringInheritanceFactReader } from '#modules/projects/infra/adapters/work-package/lucid_task_authoring_inheritance_fact_reader'
import { PostgresSearchProjectionInvalidationStager } from '#modules/search/infra/adapters/projection-generation/postgres_search_projection_invalidation_stager'
import { CreateTaskAuthoringPipeline } from '#modules/tasks/actions/commands/task-authoring/internal/create_task_authoring_pipeline'
import type { OrganizationTaskSearchCandidateReader } from '#modules/tasks/actions/ports/outbound/task_search_candidate_readers'
import { LucidTaskAssignmentContractRepository } from '#modules/tasks/infra/adapters/task-assignment/lucid_task_assignment_contract_repository'
import { LucidTaskAssignmentRepository } from '#modules/tasks/infra/adapters/task-assignment/lucid_task_assignment_repository'
import { LucidTaskAuthoringCreatePersistence } from '#modules/tasks/infra/adapters/task-authoring/lucid_task_authoring_create_persistence'
import { LucidTaskAuthoringInheritanceReader } from '#modules/tasks/infra/adapters/task-authoring/lucid_task_authoring_inheritance_reader'
import { LucidTaskLifecycleRepository } from '#modules/tasks/infra/adapters/task-authoring/lucid_task_lifecycle_repository'
import { LucidTaskFactSourceReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_fact_source_reader'
import { LucidTaskResolvedBriefReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_resolved_brief_reader'
import { LucidTaskSearchDocumentReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_search_document_reader'
import { LucidTaskSearchSyncReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_search_sync_reader'
import { LucidTaskTransactionRunner } from '#modules/tasks/infra/adapters/task-reading/lucid_task_transaction_runner'
import { LucidTaskCompletionReportRepository } from '#modules/tasks/infra/adapters/task-submissions/lucid_task_completion_report_repository'
import { LucidTaskCompletionRepository } from '#modules/tasks/infra/adapters/task-submissions/lucid_task_completion_repository'
import { LucidTaskVersionWriter } from '#modules/tasks/infra/adapters/task-submissions/lucid_task_version_writer'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import { taskCommandRepository } from '#modules/tasks/infra/repositories/task-authoring/write/task_command_repository'
import { taskIdentityQueryRepository } from '#modules/tasks/infra/repositories/task-reading/read/task_identity_query_repository'
import { taskStatusQueryRepository } from '#modules/tasks/infra/repositories/task-status/read/task_status_query_repository'

const unavailableOrganizationTaskSearchCandidates: OrganizationTaskSearchCandidateReader = {
  isEnabled: () => false,
  searchOrganizationTaskCandidates: () => Promise.resolve([]),
}

export const taskProjectReader = new TaskProjectReaderAdapter()
export const taskAuditTrailReader = new TaskAuditTrailReaderAdapter()
export const taskReviewReader = new TaskReviewReaderAdapter()
export const taskPermissionReader = new TaskPermissionReaderAdapter()
export const taskOrganizationReader = new TaskOrganizationReaderAdapter()
export const taskSkillReader = new TaskSkillReaderAdapter()
export const taskUserReader = new TaskUserReaderAdapter()
export const taskRequiredSkillPersistence = {
  resolver: new TaskRequiredSkillResolverAdapter(),
  writer: new TaskRequiredSkillWriterAdapter(),
}
export const taskActiveAssignmentReader = new TaskActiveAssignmentReaderAdapter()
export const taskFactSourceReader = new LucidTaskFactSourceReader()
export const taskLifecycleRepository = new LucidTaskLifecycleRepository()
export const taskTransactionRunner = new LucidTaskTransactionRunner()
export const taskSprintReader = new TaskSprintReaderAdapter()
export const taskAssignmentRepository = new LucidTaskAssignmentRepository()
export const taskVersionWriter = new LucidTaskVersionWriter()
export const taskCompletionRepository = new LucidTaskCompletionRepository()
export const taskCompletionReportRepository = new LucidTaskCompletionReportRepository()
const searchProjectionInvalidationStager = new PostgresSearchProjectionInvalidationStager()
export const taskResolvedBriefReader = new LucidTaskResolvedBriefReader()
export const taskContractContentHasher = new NodeTaskContractContentHasher()
export const taskAssignmentContractRepository = new LucidTaskAssignmentContractRepository(
  taskContractContentHasher
)
export const taskAssignmentContract = {
  repository: taskAssignmentContractRepository,
  hasher: taskContractContentHasher,
  identityFactory: { nextId: () => randomUUID() },
  clock: {
    nowIso: () => {
      const now = DateTime.utc().toISO()
      if (!now) throw new Error('Assignment Contract clock could not produce an ISO timestamp')
      return now
    },
  },
}
export const taskAssignmentInteractionDependencies = {
  repository: taskAssignmentContractRepository,
  transactions: taskTransactionRunner,
  hasher: taskContractContentHasher,
  identityFactory: taskAssignmentContract.identityFactory,
  clock: taskAssignmentContract.clock,
}
export const taskAuthoringInheritanceFacts = new LucidTaskAuthoringInheritanceFactReader()
export const taskAuthoring = new CreateTaskAuthoringPipeline({
  persistence: new LucidTaskAuthoringCreatePersistence(),
  inheritanceReader: new LucidTaskAuthoringInheritanceReader(taskAuthoringInheritanceFacts),
  hasher: new NodeTaskContractContentHasher(),
  identityFactory: { nextId: () => randomUUID() },
  clock: {
    nowIso: () => {
      const now = DateTime.utc().toISO()
      if (!now) throw new Error('Task authoring clock could not produce an ISO timestamp')
      return now
    },
  },
})

export const taskExternalDeps = createTaskExternalDependencies({
  auditReader: taskAuditTrailReader,
  organizationTaskSearchCandidates: unavailableOrganizationTaskSearchCandidates,
  organizationReader: taskOrganizationReader,
  projectReader: taskProjectReader,
  reviewReader: taskReviewReader,
  skillReader: taskSkillReader,
  userReader: taskUserReader,
  permissionReader: taskPermissionReader,
  requiredSkillPersistence: taskRequiredSkillPersistence,
  taskIdentityRepository: taskIdentityQueryRepository,
  taskStatusRepository: taskStatusQueryRepository,
  activeAssignmentReader: taskActiveAssignmentReader,
  authoring: taskAuthoring,
  resolvedBriefReader: taskResolvedBriefReader,
  assignmentContract: taskAssignmentContract,
  metadataAssignmentProvider: taskMetadataAssignmentProvider,
  factSourceReader: taskFactSourceReader,
  lifecycleRepository: taskLifecycleRepository,
  transactionRunner: taskTransactionRunner,
  sprintReader: taskSprintReader,
  assignmentRepository: taskAssignmentRepository,
  commandRepository: taskCommandRepository,
  versionWriter: taskVersionWriter,
  completionRepository: taskCompletionRepository,
  completionReportRepository: taskCompletionReportRepository,
  searchProjectionInvalidation: {
    stage: (input, transaction) => searchProjectionInvalidationStager.stage(transaction, {
      entityType: 'task', entityId: input.taskId, operation: input.operation,
      ...(input.sourceRevision === undefined ? {} : { sourceRevision: input.sourceRevision }),
      changedFields: input.changedFields,
      transactionKey: `task:${input.taskId}:${input.sourceRevision ?? 'auto'}`,
    }),
  },
})

export const taskSearchDocumentReader = new LucidTaskSearchDocumentReader(
  taskExternalDeps.skill,
  taskMetadataAssignmentProvider
)
export const taskSearchSyncReader = new LucidTaskSearchSyncReader()
