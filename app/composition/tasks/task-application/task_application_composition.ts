import { ReviewsTaskCompletionReviewPackageAccessAdapter } from '#composition/adapters/reviews/reviews_task_completion_review_package_access_adapter'
import { ReviewsTaskSubmissionReviewGovernanceAdapter } from '#composition/adapters/reviews/reviews_task_submission_review_governance_adapter'
import { notificationTransactionStager } from '#composition/notifications/notification-feed/notification_composition'
import {
  taskAssignmentInteractionDependencies,
  taskExternalDeps,
} from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import {
  ComposedTaskBoardQueryFactory,
  ComposedTaskCompletionApplicationFactory,
  ComposedTaskDetailQueryFactory,
  ComposedTaskLifecycleCommandFactory,
  ComposedTaskStatusDefinitionCommandFactory,
  ComposedTaskStatusWorkflowCommandFactory,
} from '#composition/tasks/task-factories/task_application_factories'
import { searchAwareTaskExternalDependencies } from '#composition/tasks/task-search/tasks_search_composition'
import { notificationFanoutPublicApi } from '#modules/notifications/public_contracts/notification_fanout'
import AcknowledgeTaskAssignmentContractCommand from '#modules/tasks/actions/commands/task-assignment/acknowledge_task_assignment_contract_command'
import RequestTaskAssignmentClarificationCommand from '#modules/tasks/actions/commands/task-assignment/request_task_assignment_clarification_command'
import AddTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/add_task_requirement_command'
import PrefillTaskRequirementsFromRoleCommand from '#modules/tasks/actions/commands/task-requirements/prefill_task_requirements_from_role_command'
import RemoveTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/remove_task_requirement_command'
import UpdateTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/update_task_requirement_command'
import CheckTaskCreatePermissionQuery from '#modules/tasks/actions/queries/task-authoring/check_task_create_permission_query'
import GetUserTasksQuery from '#modules/tasks/actions/queries/task-reading/get_user_tasks_query'
import GetRoleRequirementsQuery from '#modules/tasks/actions/queries/task-requirements/get_role_requirements_query'
import ListTaskRequirementProjectionsQuery from '#modules/tasks/actions/queries/task-requirements/list_task_requirement_projections_query'
import ListTaskRequirementVersionsQuery from '#modules/tasks/actions/queries/task-requirements/list_task_requirement_versions_query'
import GetTaskStatusQuery from '#modules/tasks/actions/queries/task-status/get_task_status_query'
import ListTaskStatusesQuery from '#modules/tasks/actions/queries/task-status/list_task_statuses_query'
import ListWorkflowQuery from '#modules/tasks/actions/queries/task-workflow/list_workflow_query'
import { DriveTaskAttachmentStorage } from '#modules/tasks/infra/adapters/task-attachments/drive_task_attachment_storage'
import { InProcessTaskEventPublisher } from '#modules/tasks/infra/adapters/task-authoring/in_process_task_event_publisher'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'
import { LucidTaskReadRepository } from '#modules/tasks/infra/adapters/task-reading/lucid_task_read_repository'
import { LucidTaskTransactionRunner } from '#modules/tasks/infra/adapters/task-reading/lucid_task_transaction_runner'
import { LucidTaskRequirementProjectionReader } from '#modules/tasks/infra/adapters/task-requirements/lucid_task_requirement_projection_reader'
import {
  LucidTaskRequirementReader,
  LucidTaskRequirementWriter,
} from '#modules/tasks/infra/adapters/task-requirements/lucid_task_requirement_repository'
import { taskStatusQueryRepository } from '#modules/tasks/infra/repositories/task-status/read/task_status_query_repository'
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task-workflow/task_workflow_transition_repository'

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
  findByProject: (projectId, organizationId) =>
    TaskWorkflowTransitionRepository.findByProject(projectId, undefined, organizationId),
})

export const taskLifecycleCommandFactory = new ComposedTaskLifecycleCommandFactory(
  taskExternalDeps,
  notificationTransactionStager,
  taskCache,
  taskEvents
)

export const taskAssignmentInteractionCommandFactory = {
  makeAcknowledge: (context: import('#modules/tasks/actions/task_action_context').TaskActionContext) =>
    new AcknowledgeTaskAssignmentContractCommand(context, taskAssignmentInteractionDependencies),
  makeClarification: (context: import('#modules/tasks/actions/task_action_context').TaskActionContext) =>
    new RequestTaskAssignmentClarificationCommand(context, taskAssignmentInteractionDependencies),
}

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
    new DriveTaskAttachmentStorage(),
    new ReviewsTaskCompletionReviewPackageAccessAdapter()
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
  taskTransactions,
  taskExternalDeps.searchProjectionInvalidation
)
export const removeTaskRequirementCommand = new RemoveTaskRequirementCommand(
  taskRequirementReader,
  taskRequirementWriter,
  taskExternalDeps.skill,
  taskTransactions
)
export const listTaskRequirementVersionsQuery =
  new ListTaskRequirementVersionsQuery(taskRequirementReader)
