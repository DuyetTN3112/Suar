import { ReviewsTaskSubmissionReviewGovernanceAdapter } from './adapters/reviews_task_submission_review_governance_adapter.js'
import { notificationTransactionStager } from './notification_composition.js'
import {
  ComposedTaskBoardQueryFactory,
  ComposedTaskCompletionApplicationFactory,
  ComposedTaskDetailQueryFactory,
  ComposedTaskLifecycleCommandFactory,
  ComposedTaskStatusDefinitionCommandFactory,
  ComposedTaskStatusWorkflowCommandFactory,
} from './task_application_factories.js'
import { taskExternalDeps } from './task_external_dependencies_composition.js'
import { searchAwareTaskExternalDependencies } from './tasks_search_composition.js'

import { notificationFanoutPublicApi } from '#modules/notifications/public_contracts/notification_fanout'
import AddTaskRequirementCommand from '#modules/tasks/actions/commands/add_task_requirement_command'
import PrefillTaskRequirementsFromRoleCommand from '#modules/tasks/actions/commands/prefill_task_requirements_from_role_command'
import RemoveTaskRequirementCommand from '#modules/tasks/actions/commands/remove_task_requirement_command'
import UpdateTaskRequirementCommand from '#modules/tasks/actions/commands/update_task_requirement_command'
import CheckTaskCreatePermissionQuery from '#modules/tasks/actions/queries/check_task_create_permission_query'
import GetRoleRequirementsQuery from '#modules/tasks/actions/queries/get_role_requirements_query'
import GetTaskStatusQuery from '#modules/tasks/actions/queries/get_task_status_query'
import GetUserTasksQuery from '#modules/tasks/actions/queries/get_user_tasks_query'
import ListTaskRequirementProjectionsQuery from '#modules/tasks/actions/queries/list_task_requirement_projections_query'
import ListTaskRequirementVersionsQuery from '#modules/tasks/actions/queries/list_task_requirement_versions_query'
import ListTaskStatusesQuery from '#modules/tasks/actions/queries/list_task_statuses_query'
import ListWorkflowQuery from '#modules/tasks/actions/queries/list_workflow_query'
import { DriveTaskAttachmentStorage } from '#modules/tasks/infra/adapters/drive_task_attachment_storage'
import { InProcessTaskEventPublisher } from '#modules/tasks/infra/adapters/in_process_task_event_publisher'
import { LucidTaskReadRepository } from '#modules/tasks/infra/adapters/lucid_task_read_repository'
import { LucidTaskRequirementProjectionReader } from '#modules/tasks/infra/adapters/lucid_task_requirement_projection_reader'
import {
  LucidTaskRequirementReader,
  LucidTaskRequirementWriter,
} from '#modules/tasks/infra/adapters/lucid_task_requirement_repository'
import { LucidTaskTransactionRunner } from '#modules/tasks/infra/adapters/lucid_task_transaction_runner'
import { TaskCacheInvalidator } from '#modules/tasks/infra/cache/task_cache_invalidator'
import { taskStatusQueryRepository } from '#modules/tasks/infra/repositories/read/task_status_query_repository'
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'

const taskCache = new TaskCacheInvalidator()
const taskEvents = new InProcessTaskEventPublisher()
const taskTransactions = new LucidTaskTransactionRunner()
const taskRequirementReader = new LucidTaskRequirementReader()
const taskRequirementWriter = new LucidTaskRequirementWriter()
export const taskReadRepository = new LucidTaskReadRepository()
export { taskStatusQueryRepository }
export const getUserTasksQuery = new GetUserTasksQuery(taskReadRepository)
export const listTaskStatusesQuery = new ListTaskStatusesQuery(taskStatusQueryRepository)
export const getTaskStatusQuery = new GetTaskStatusQuery(taskStatusQueryRepository)
export const listWorkflowQuery = new ListWorkflowQuery({
  findByOrganization: (organizationId) =>
    TaskWorkflowTransitionRepository.findByOrganization(organizationId),
})

export const taskLifecycleCommandFactory = new ComposedTaskLifecycleCommandFactory(
  taskExternalDeps,
  notificationTransactionStager,
  taskCache,
  taskEvents
)

export const taskStatusWorkflowCommandFactory = new ComposedTaskStatusWorkflowCommandFactory(
  taskExternalDeps,
  notificationTransactionStager,
  taskCache,
  taskEvents
)
export const taskStatusDefinitionCommandFactory = new ComposedTaskStatusDefinitionCommandFactory(
  taskCache,
  taskExternalDeps.review,
  taskExternalDeps
)

export const taskDetailQueryFactory = new ComposedTaskDetailQueryFactory(
  taskExternalDeps,
  taskReadRepository,
  taskStatusQueryRepository
)
export const taskBoardQueryFactory = new ComposedTaskBoardQueryFactory(
  searchAwareTaskExternalDependencies,
  taskReadRepository,
  taskStatusQueryRepository
)
export const taskCompletionApplicationFactory =
  new ComposedTaskCompletionApplicationFactory(
    taskExternalDeps,
    new ReviewsTaskSubmissionReviewGovernanceAdapter(),
    notificationFanoutPublicApi,
    new DriveTaskAttachmentStorage()
  )

export const checkTaskCreatePermissionQuery = new CheckTaskCreatePermissionQuery(
  taskExternalDeps.permission
)
export const listTaskRequirementProjectionsQuery =
  new ListTaskRequirementProjectionsQuery(
    new LucidTaskRequirementProjectionReader(),
    taskExternalDeps.skill
  )
export const getRoleRequirementsQuery = new GetRoleRequirementsQuery(taskExternalDeps.skill)
export const addTaskRequirementCommand = new AddTaskRequirementCommand(
  taskRequirementReader,
  taskRequirementWriter,
  taskExternalDeps.skill,
  taskTransactions
)
export const prefillTaskRequirementsFromRoleCommand =
  new PrefillTaskRequirementsFromRoleCommand(
    taskRequirementReader,
    taskRequirementWriter,
    taskExternalDeps.skill,
    taskTransactions
  )
export const updateTaskRequirementCommand = new UpdateTaskRequirementCommand(
  taskRequirementReader,
  taskRequirementWriter,
  taskExternalDeps.skill,
  taskTransactions
)
export const removeTaskRequirementCommand = new RemoveTaskRequirementCommand(
  taskRequirementReader,
  taskRequirementWriter,
  taskExternalDeps.skill,
  taskTransactions
)
export const listTaskRequirementVersionsQuery =
  new ListTaskRequirementVersionsQuery(taskRequirementReader)
