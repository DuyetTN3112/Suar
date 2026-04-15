import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import {
  ComposedTaskBoardQueryFactory,
  ComposedTaskDetailQueryFactory,
  ComposedTaskLifecycleCommandFactory,
  ComposedTaskStatusDefinitionCommandFactory,
  ComposedTaskStatusWorkflowCommandFactory,
} from '#composition/task_application_factories'
import { taskExternalDeps } from '#composition/task_external_dependencies_composition'
import BatchUpdateTaskStatusCommand from '#modules/tasks/actions/commands/batch_update_task_status_command'
import CreateTaskCommand from '#modules/tasks/actions/commands/create_task_command'
import CreateTaskStatusCommand from '#modules/tasks/actions/commands/create_task_status_command'
import DeleteTaskCommand from '#modules/tasks/actions/commands/delete_task_command'
import DeleteTaskStatusCommand from '#modules/tasks/actions/commands/delete_task_status_command'
import UpdateTaskCommand from '#modules/tasks/actions/commands/update_task_command'
import UpdateTaskSortOrderCommand from '#modules/tasks/actions/commands/update_task_sort_order_command'
import UpdateTaskStatusCommand from '#modules/tasks/actions/commands/update_task_status_command'
import UpdateTaskStatusDefinitionCommand from '#modules/tasks/actions/commands/update_task_status_definition_command'
import UpdateTaskTimeCommand from '#modules/tasks/actions/commands/update_task_time_command'
import { TaskBoardQueryFactory } from '#modules/tasks/actions/ports/inbound/task_board_query_factory'
import { TaskDetailQueryFactory } from '#modules/tasks/actions/ports/inbound/task_detail_query_factory'
import { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'
import { TaskStatusDefinitionCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_definition_command_factory'
import { TaskStatusWorkflowCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_workflow_command_factory'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import CheckTaskCreatePermissionQuery from '#modules/tasks/actions/queries/check_task_create_permission_query'
import GetRoleRequirementsQuery from '#modules/tasks/actions/queries/get_role_requirements_query'
import GetTaskAuditLogsQuery from '#modules/tasks/actions/queries/get_task_audit_logs_query'
import GetTaskCreatePageQuery from '#modules/tasks/actions/queries/get_task_create_page_query'
import GetTaskDetailQuery from '#modules/tasks/actions/queries/get_task_detail_query'
import GetTaskEditPageQuery from '#modules/tasks/actions/queries/get_task_edit_page_query'
import GetTasksGroupedQuery from '#modules/tasks/actions/queries/get_tasks_grouped_query'
import GetTasksIndexPageQuery from '#modules/tasks/actions/queries/get_tasks_index_page_query'
import GetTasksTimelineQuery from '#modules/tasks/actions/queries/get_tasks_timeline_query'
import ListTaskRequirementProjectionsQuery from '#modules/tasks/actions/queries/list_task_requirement_projections_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import ListMyWorkController from '#modules/tasks/controllers/list_my_work_controller'
import ListTaskStatusesController from '#modules/tasks/controllers/list_task_statuses_controller'
import ListWorkflowController from '#modules/tasks/controllers/list_workflow_controller'
import V1ListTaskStatusesController from '#modules/tasks/controllers/v1/list_task_statuses_controller'
import V1ListWorkflowController from '#modules/tasks/controllers/v1/list_workflow_controller'
import { LucidTaskReadRepository } from '#modules/tasks/infra/adapters/lucid_task_read_repository'
import { taskStatusQueryRepository } from '#modules/tasks/infra/repositories/read/task_status_query_repository'

const externalDependencies: TaskExternalDependencies = taskExternalDeps
const notifications: TaskNotificationStager = {
  stage: () => Promise.resolve(undefined),
}
const cache: TaskCachePort = {
  invalidateAfterTaskCreated: () => Promise.resolve(undefined),
  invalidateAfterTaskCollectionMetadataChanged: () => Promise.resolve(undefined),
  invalidateAfterTaskUpdated: () => Promise.resolve(undefined),
  invalidateAfterTaskDeleted: () => Promise.resolve(undefined),
  invalidateAfterTaskAssigned: () => Promise.resolve(undefined),
  invalidateAfterTaskAccessChanged: () => Promise.resolve(undefined),
  invalidateAfterTaskApplicationChanged: () => Promise.resolve(undefined),
  invalidateTaskScopedCaches: () => Promise.resolve(undefined),
}
const events: TaskEventPublisher = {
  publishTaskCreated: () => Promise.resolve(undefined),
  publishTaskUpdated: () => Promise.resolve(undefined),
  publishTaskDeleted: () => Promise.resolve(undefined),
  publishTaskStatusChanged: () => Promise.resolve(undefined),
  publishTaskAssignmentCompleted: () => Promise.resolve(undefined),
  publishTaskAssigned: () => Promise.resolve(undefined),
  publishTaskAccessRevoked: () => Promise.resolve(undefined),
  publishTaskApplicationSubmitted: () => Promise.resolve(undefined),
  publishTaskApplicationReviewed: () => Promise.resolve(undefined),
}
const context = makeSystemTaskActionContext('user-1')
const taskReadRepository = new LucidTaskReadRepository()

test.group('Task application factories', () => {
  test('lifecycle factory creates fresh context-bound commands', ({ assert }) => {
    const factory = new ComposedTaskLifecycleCommandFactory(
      externalDependencies,
      notifications,
      cache,
      events
    )

    assert.instanceOf(factory.makeCreate(context), CreateTaskCommand)
    assert.instanceOf(factory.makeUpdate(context), UpdateTaskCommand)
    assert.instanceOf(factory.makeDelete(context), DeleteTaskCommand)
    assert.instanceOf(factory.makeUpdateTime(context), UpdateTaskTimeCommand)
    assert.notStrictEqual(factory.makeCreate(context), factory.makeCreate(context))
  })

  test('status workflow factory exposes only supported status mutations', ({ assert }) => {
    const factory = new ComposedTaskStatusWorkflowCommandFactory(
      externalDependencies,
      notifications,
      cache,
      events
    )

    assert.instanceOf(factory.makeBatchUpdate(context), BatchUpdateTaskStatusCommand)
    assert.instanceOf(factory.makeUpdateSortOrder(context), UpdateTaskSortOrderCommand)
    assert.instanceOf(factory.makeUpdateStatus(context), UpdateTaskStatusCommand)
  })

  test('status definition factory avoids unrelated board dependencies', ({ assert }) => {
    const factory = new ComposedTaskStatusDefinitionCommandFactory(
      cache,
      externalDependencies.review,
      externalDependencies
    )

    assert.instanceOf(factory.makeCreate(context), CreateTaskStatusCommand)
    assert.instanceOf(factory.makeDelete(context), DeleteTaskStatusCommand)
    assert.instanceOf(factory.makeUpdate(context), UpdateTaskStatusDefinitionCommand)
  })

  test('detail factory creates detail, audit and form queries', ({ assert }) => {
    const factory = new ComposedTaskDetailQueryFactory(
      externalDependencies,
      taskReadRepository,
      taskStatusQueryRepository
    )

    assert.instanceOf(factory.makeDetail(context), GetTaskDetailQuery)
    assert.instanceOf(factory.makeAuditLogs(context), GetTaskAuditLogsQuery)
    assert.instanceOf(factory.makeCreatePage(context), GetTaskCreatePageQuery)
    assert.instanceOf(factory.makeEditPage(context), GetTaskEditPageQuery)
  })

  test('board factory creates search-aware collection queries', ({ assert }) => {
    const factory = new ComposedTaskBoardQueryFactory(
      externalDependencies,
      taskReadRepository,
      taskStatusQueryRepository
    )

    assert.instanceOf(factory.makeIndexPage(context), GetTasksIndexPageQuery)
    assert.instanceOf(factory.makeGrouped(context), GetTasksGroupedQuery)
    assert.instanceOf(factory.makeTimeline(context), GetTasksTimelineQuery)
  })

  test('application provider resolves all controller-facing capabilities', async ({ assert }) => {
    const [
      lifecycle,
      statusWorkflow,
      statusDefinitions,
      details,
      board,
      permission,
      requirements,
      roleRequirements,
      myWorkController,
      taskStatusesController,
      workflowController,
      v1TaskStatusesController,
      v1WorkflowController,
    ] = await Promise.all([
      app.container.make(TaskLifecycleCommandFactory),
      app.container.make(TaskStatusWorkflowCommandFactory),
      app.container.make(TaskStatusDefinitionCommandFactory),
      app.container.make(TaskDetailQueryFactory),
      app.container.make(TaskBoardQueryFactory),
      app.container.make(CheckTaskCreatePermissionQuery),
      app.container.make(ListTaskRequirementProjectionsQuery),
      app.container.make(GetRoleRequirementsQuery),
      app.container.make(ListMyWorkController),
      app.container.make(ListTaskStatusesController),
      app.container.make(ListWorkflowController),
      app.container.make(V1ListTaskStatusesController),
      app.container.make(V1ListWorkflowController),
    ])

    assert.instanceOf(lifecycle, TaskLifecycleCommandFactory)
    assert.instanceOf(statusWorkflow, TaskStatusWorkflowCommandFactory)
    assert.instanceOf(statusDefinitions, TaskStatusDefinitionCommandFactory)
    assert.instanceOf(details, TaskDetailQueryFactory)
    assert.instanceOf(board, TaskBoardQueryFactory)
    assert.instanceOf(permission, CheckTaskCreatePermissionQuery)
    assert.instanceOf(requirements, ListTaskRequirementProjectionsQuery)
    assert.instanceOf(roleRequirements, GetRoleRequirementsQuery)
    assert.instanceOf(myWorkController, ListMyWorkController)
    assert.instanceOf(taskStatusesController, ListTaskStatusesController)
    assert.instanceOf(workflowController, ListWorkflowController)
    assert.instanceOf(v1TaskStatusesController, V1ListTaskStatusesController)
    assert.instanceOf(v1WorkflowController, V1ListWorkflowController)
  })
})
