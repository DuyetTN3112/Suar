import type { ApplicationService } from '@adonisjs/core/types'

import { ReviewsTaskSubmissionReviewGovernanceAdapter } from '#composition/adapters/reviews/reviews_task_submission_review_governance_adapter'
import {
  addTaskRequirementCommand,
  checkTaskCreatePermissionQuery,
  getUserTasksQuery,
  getRoleRequirementsQuery,
  getTaskStatusQuery,
  listTaskRequirementVersionsQuery,
  listTaskStatusesQuery,
  listWorkflowQuery,
  listTaskRequirementProjectionsQuery,
  prefillTaskRequirementsFromRoleCommand,
  removeTaskRequirementCommand,
  taskBoardQueryFactory,
  taskCompletionApplicationFactory,
  taskDetailQueryFactory,
  taskLifecycleCommandFactory,
  taskAssignmentInteractionCommandFactory,
  taskStatusDefinitionCommandFactory,
  taskStatusWorkflowCommandFactory,
  updateTaskRequirementCommand,
} from '#composition/tasks/task-application/task_application_composition'

import { taskMetadataAssignmentProvider } from '#composition/tasks/task-metadata/task_metadata_assignment_composition'
import AddTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/add_task_requirement_command'
import PrefillTaskRequirementsFromRoleCommand from '#modules/tasks/actions/commands/task-requirements/prefill_task_requirements_from_role_command'
import RemoveTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/remove_task_requirement_command'
import UpdateTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/update_task_requirement_command'
import { TaskAssignmentInteractionCommandFactory } from '#modules/tasks/actions/ports/inbound/task_assignment_interaction_command_factory'
import { TaskBoardQueryFactory } from '#modules/tasks/actions/ports/inbound/task_board_query_factory'
import { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'
import { TaskDetailQueryFactory } from '#modules/tasks/actions/ports/inbound/task_detail_query_factory'
import { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'
import { TaskStatusDefinitionCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_definition_command_factory'
import { TaskStatusWorkflowCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_workflow_command_factory'
import { TaskSubmissionReviewGovernance } from '#modules/tasks/actions/ports/outbound/task_submission_review_governance'
import CheckTaskCreatePermissionQuery from '#modules/tasks/actions/queries/task-authoring/check_task_create_permission_query'
import GetRoleRequirementsQuery from '#modules/tasks/actions/queries/task-requirements/get_role_requirements_query'
import GetTaskStatusQuery from '#modules/tasks/actions/queries/task-status/get_task_status_query'
import GetUserTasksQuery from '#modules/tasks/actions/queries/task-reading/get_user_tasks_query'
import ListTaskRequirementProjectionsQuery from '#modules/tasks/actions/queries/task-requirements/list_task_requirement_projections_query'
import ListTaskRequirementVersionsQuery from '#modules/tasks/actions/queries/task-requirements/list_task_requirement_versions_query'
import ListTaskStatusesQuery from '#modules/tasks/actions/queries/task-status/list_task_statuses_query'
import ListWorkflowQuery from '#modules/tasks/actions/queries/task-workflow/list_workflow_query'
import { TaskMetadataAssignmentProvider } from '#modules/tasks/infra/adapters/task-assignment/task_metadata_assignment_provider'

/**
 * Registers Tasks-owned inbound application capabilities.
 *
 * Concrete adapters and infrastructure remain in outer composition. Tasks
 * controllers resolve only module-owned commands, queries and narrow factories.
 */
export default class TaskApplicationProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(
      TaskMetadataAssignmentProvider,
      () => taskMetadataAssignmentProvider
    )
    this.app.container.singleton(
      TaskLifecycleCommandFactory,
      () => taskLifecycleCommandFactory
    )
    this.app.container.singleton(
      TaskAssignmentInteractionCommandFactory,
      () => taskAssignmentInteractionCommandFactory
    )
    this.app.container.singleton(
      TaskStatusWorkflowCommandFactory,
      () => taskStatusWorkflowCommandFactory
    )
    this.app.container.singleton(
      TaskStatusDefinitionCommandFactory,
      () => taskStatusDefinitionCommandFactory
    )
    this.app.container.singleton(TaskDetailQueryFactory, () => taskDetailQueryFactory)
    this.app.container.singleton(TaskBoardQueryFactory, () => taskBoardQueryFactory)
    this.app.container.singleton(
      TaskCompletionApplicationFactory,
      () => taskCompletionApplicationFactory
    )
    this.app.container.singleton(
      CheckTaskCreatePermissionQuery,
      () => checkTaskCreatePermissionQuery
    )
    this.app.container.singleton(
      ListTaskRequirementProjectionsQuery,
      () => listTaskRequirementProjectionsQuery
    )
    this.app.container.singleton(
      AddTaskRequirementCommand,
      () => addTaskRequirementCommand
    )
    this.app.container.singleton(
      PrefillTaskRequirementsFromRoleCommand,
      () => prefillTaskRequirementsFromRoleCommand
    )
    this.app.container.singleton(
      UpdateTaskRequirementCommand,
      () => updateTaskRequirementCommand
    )
    this.app.container.singleton(
      RemoveTaskRequirementCommand,
      () => removeTaskRequirementCommand
    )
    this.app.container.singleton(
      ListTaskRequirementVersionsQuery,
      () => listTaskRequirementVersionsQuery
    )
    this.app.container.singleton(GetUserTasksQuery, () => getUserTasksQuery)
    this.app.container.singleton(
      GetRoleRequirementsQuery,
      () => getRoleRequirementsQuery
    )
    this.app.container.singleton(ListTaskStatusesQuery, () => listTaskStatusesQuery)
    this.app.container.singleton(GetTaskStatusQuery, () => getTaskStatusQuery)
    this.app.container.singleton(ListWorkflowQuery, () => listWorkflowQuery)
    this.app.container.singleton(
      TaskSubmissionReviewGovernance,
      () => new ReviewsTaskSubmissionReviewGovernanceAdapter()
    )
  }
}
