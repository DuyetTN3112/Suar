import { TaskActiveAssignmentReaderAdapter } from './adapters/task_active_assignment_reader_adapter.js'
import { TaskAuditTrailReaderAdapter } from './adapters/task_audit_trail_reader_adapter.js'
import { TaskOrganizationReaderAdapter } from './adapters/task_organization_reader_adapter.js'
import { TaskPermissionReaderAdapter } from './adapters/task_permission_reader_adapter.js'
import { TaskProjectReaderAdapter } from './adapters/task_project_reader_adapter.js'
import {
  TaskRequiredSkillResolverAdapter,
  TaskRequiredSkillWriterAdapter,
} from './adapters/task_required_skill_persistence_adapter.js'
import { TaskReviewReaderAdapter } from './adapters/task_review_reader_adapter.js'
import { TaskSkillReaderAdapter } from './adapters/task_skill_reader_adapter.js'
import { TaskSprintReaderAdapter } from './adapters/task_sprint_reader_adapter.js'
import { TaskUserReaderAdapter } from './adapters/task_user_reader_adapter.js'
import { createTaskExternalDependencies } from './create_task_external_dependencies.js'

import type { OrganizationTaskSearchCandidateReader } from '#modules/tasks/actions/ports/outbound/task_search_candidate_readers'
import { LucidTaskAssignmentRepository } from '#modules/tasks/infra/adapters/lucid_task_assignment_repository'
import { LucidTaskCompletionRepository } from '#modules/tasks/infra/adapters/lucid_task_completion_repository'
import { LucidTaskFactSourceReader } from '#modules/tasks/infra/adapters/lucid_task_fact_source_reader'
import { LucidTaskLifecycleRepository } from '#modules/tasks/infra/adapters/lucid_task_lifecycle_repository'
import { LucidTaskSearchDocumentReader } from '#modules/tasks/infra/adapters/lucid_task_search_document_reader'
import { LucidTaskSearchSyncReader } from '#modules/tasks/infra/adapters/lucid_task_search_sync_reader'
import { LucidTaskTransactionRunner } from '#modules/tasks/infra/adapters/lucid_task_transaction_runner'
import { LucidTaskVersionWriter } from '#modules/tasks/infra/adapters/lucid_task_version_writer'
import { taskIdentityQueryRepository } from '#modules/tasks/infra/repositories/read/task_identity_query_repository'
import { taskStatusQueryRepository } from '#modules/tasks/infra/repositories/read/task_status_query_repository'
import { taskCommandRepository } from '#modules/tasks/infra/repositories/write/task_command_repository'

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
  factSourceReader: taskFactSourceReader,
  lifecycleRepository: taskLifecycleRepository,
  transactionRunner: taskTransactionRunner,
  sprintReader: taskSprintReader,
  assignmentRepository: taskAssignmentRepository,
  commandRepository: taskCommandRepository,
  versionWriter: taskVersionWriter,
  completionRepository: taskCompletionRepository,
})

export const taskSearchDocumentReader = new LucidTaskSearchDocumentReader(
  taskExternalDeps.skill
)
export const taskSearchSyncReader = new LucidTaskSearchSyncReader()
