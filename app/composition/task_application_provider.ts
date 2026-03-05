import type { ApplicationService } from '@adonisjs/core/types'

import { ReviewsTaskSubmissionReviewGovernanceAdapter } from './adapters/reviews_task_submission_review_governance_adapter.js'
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
  taskStatusDefinitionCommandFactory,
  taskStatusWorkflowCommandFactory,
  updateTaskRequirementCommand,
} from './task_application_composition.js'

import AddTaskRequirementCommand from '#modules/tasks/actions/commands/add_task_requirement_command'
import PrefillTaskRequirementsFromRoleCommand from '#modules/tasks/actions/commands/prefill_task_requirements_from_role_command'
import RemoveTaskRequirementCommand from '#modules/tasks/actions/commands/remove_task_requirement_command'
import UpdateTaskRequirementCommand from '#modules/tasks/actions/commands/update_task_requirement_command'
import { TaskBoardQueryFactory } from '#modules/tasks/actions/ports/inbound/task_board_query_factory'
import { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'
import { TaskDetailQueryFactory } from '#modules/tasks/actions/ports/inbound/task_detail_query_factory'
import { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'
import { TaskStatusDefinitionCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_definition_command_factory'
import { TaskStatusWorkflowCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_workflow_command_factory'
import { TaskSubmissionReviewGovernance } from '#modules/tasks/actions/ports/outbound/task_submission_review_governance'
import CheckTaskCreatePermissionQuery from '#modules/tasks/actions/queries/check_task_create_permission_query'
import GetRoleRequirementsQuery from '#modules/tasks/actions/queries/get_role_requirements_query'
import GetTaskStatusQuery from '#modules/tasks/actions/queries/get_task_status_query'
import GetUserTasksQuery from '#modules/tasks/actions/queries/get_user_tasks_query'
import ListTaskRequirementProjectionsQuery from '#modules/tasks/actions/queries/list_task_requirement_projections_query'
import ListTaskRequirementVersionsQuery from '#modules/tasks/actions/queries/list_task_requirement_versions_query'
import ListTaskStatusesQuery from '#modules/tasks/actions/queries/list_task_statuses_query'
import ListWorkflowQuery from '#modules/tasks/actions/queries/list_workflow_query'

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
      TaskLifecycleCommandFactory,
      () => taskLifecycleCommandFactory
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
