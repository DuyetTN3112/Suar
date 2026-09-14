import { ComposedTaskCompletionApplicationFactory } from './task_completion_application_factory.js'

import { makeCompleteTaskAssignmentsCommand } from '#composition/tasks/task-completion/task_completion_transition_composition'
import CreateTaskCommand from '#modules/tasks/actions/commands/task-authoring/create_task_command'
import DeleteTaskCommand from '#modules/tasks/actions/commands/task-authoring/delete_task_command'
import UpdateTaskCommand from '#modules/tasks/actions/commands/task-authoring/update_task_command'
import UpdateTaskSortOrderCommand from '#modules/tasks/actions/commands/task-authoring/update_task_sort_order_command'
import UpdateTaskTimeCommand from '#modules/tasks/actions/commands/task-authoring/update_task_time_command'
import BatchUpdateTaskStatusCommand from '#modules/tasks/actions/commands/task-status/batch_update_task_status_command'
import CreateTaskStatusCommand from '#modules/tasks/actions/commands/task-status/create_task_status_command'
import DeleteTaskStatusCommand from '#modules/tasks/actions/commands/task-status/delete_task_status_command'
import UpdateTaskStatusCommand from '#modules/tasks/actions/commands/task-status/update_task_status_command'
import UpdateTaskStatusDefinitionCommand from '#modules/tasks/actions/commands/task-status/update_task_status_definition_command'
import ReplaceTaskWorkflowTransitionsCommand from '#modules/tasks/actions/commands/task-workflow/replace_task_workflow_transitions_command'
import { TaskBoardQueryFactory } from '#modules/tasks/actions/ports/inbound/task_board_query_factory'
import { TaskDetailQueryFactory } from '#modules/tasks/actions/ports/inbound/task_detail_query_factory'
import { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'
import { TaskStatusDefinitionCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_definition_command_factory'
import { TaskStatusWorkflowCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_workflow_command_factory'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskReadRepository } from '#modules/tasks/actions/ports/outbound/task_read_repository'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import type { TaskStatusReviewReader } from '#modules/tasks/actions/ports/outbound/task_status_review_reader'
import GetTaskAuditLogsQuery from '#modules/tasks/actions/queries/task-authoring/get_task_audit_logs_query'
import GetTaskCreatePageQuery from '#modules/tasks/actions/queries/task-authoring/get_task_create_page_query'
import GetTaskDetailQuery from '#modules/tasks/actions/queries/task-reading/get_task_detail_query'
import GetTaskEditPageQuery from '#modules/tasks/actions/queries/task-reading/get_task_edit_page_query'
import GetTasksGroupedQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_grouped_query'
import GetTasksIndexPageQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_index_page_query'
import GetTasksTimelineQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_timeline_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export { ComposedTaskCompletionApplicationFactory }

export class ComposedTaskLifecycleCommandFactory extends TaskLifecycleCommandFactory {
  constructor(
    private readonly externalDependencies: TaskExternalDependencies,
    private readonly notifications: TaskNotificationStager,
    private readonly cache: TaskCachePort,
    private readonly events: TaskEventPublisher
  ) {
    super()
  }

  override makeCreate(context: TaskActionContext): CreateTaskCommand {
    return new CreateTaskCommand(
      context,
      this.externalDependencies,
      this.notifications,
      this.cache,
      this.events
    )
  }

  override makeUpdate(context: TaskActionContext): UpdateTaskCommand {
    return new UpdateTaskCommand(
      context,
      this.externalDependencies,
      this.notifications,
      this.cache,
      this.events
    )
  }

  override makeDelete(context: TaskActionContext): DeleteTaskCommand {
    return new DeleteTaskCommand(
      context,
      this.externalDependencies,
      this.notifications,
      this.cache,
      this.events
    )
  }

  override makeUpdateTime(context: TaskActionContext): UpdateTaskTimeCommand {
    return new UpdateTaskTimeCommand(context, this.externalDependencies, this.cache, this.events)
  }
}

export class ComposedTaskStatusWorkflowCommandFactory extends TaskStatusWorkflowCommandFactory {
  constructor(
    private readonly externalDependencies: TaskExternalDependencies,
    private readonly notifications: TaskNotificationStager,
    private readonly cache: TaskCachePort,
    private readonly events: TaskEventPublisher
  ) {
    super()
  }

  override makeBatchUpdate(context: TaskActionContext): BatchUpdateTaskStatusCommand {
    return new BatchUpdateTaskStatusCommand(
      context,
      this.externalDependencies,
      this.cache,
      this.events,
      makeCompleteTaskAssignmentsCommand(this.externalDependencies)
    )
  }

  override makeUpdateSortOrder(context: TaskActionContext): UpdateTaskSortOrderCommand {
    return new UpdateTaskSortOrderCommand(
      context,
      this.externalDependencies,
      this.cache,
      this.events,
      makeCompleteTaskAssignmentsCommand(this.externalDependencies)
    )
  }

  override makeUpdateStatus(context: TaskActionContext): UpdateTaskStatusCommand {
    return new UpdateTaskStatusCommand(
      context,
      this.externalDependencies,
      this.notifications,
      this.cache,
      this.events,
      makeCompleteTaskAssignmentsCommand(this.externalDependencies)
    )
  }

  override makeReplaceWorkflow(context: TaskActionContext): ReplaceTaskWorkflowTransitionsCommand {
    return new ReplaceTaskWorkflowTransitionsCommand(context, this.externalDependencies)
  }
}

export class ComposedTaskStatusDefinitionCommandFactory extends TaskStatusDefinitionCommandFactory {
  constructor(
    private readonly cache: TaskCachePort,
    private readonly reviews: TaskStatusReviewReader,
    private readonly externalDependencies: TaskExternalDependencies
  ) {
    super()
  }

  override makeCreate(context: TaskActionContext): CreateTaskStatusCommand {
    return new CreateTaskStatusCommand(context, this.cache, this.externalDependencies)
  }

  override makeUpdate(context: TaskActionContext): UpdateTaskStatusDefinitionCommand {
    return new UpdateTaskStatusDefinitionCommand(context, this.cache, this.externalDependencies)
  }

  override makeDelete(context: TaskActionContext): DeleteTaskStatusCommand {
    return new DeleteTaskStatusCommand(context, this.reviews, this.cache, this.externalDependencies)
  }
}

export class ComposedTaskDetailQueryFactory extends TaskDetailQueryFactory {
  constructor(
    private readonly externalDependencies: TaskExternalDependencies,
    private readonly readRepository: TaskReadRepository,
    private readonly statusRepository: Pick<TaskStatusQueryRepositoryPort, 'findByOrganization'>
  ) {
    super()
  }

  override makeDetail(context: TaskActionContext): GetTaskDetailQuery {
    return new GetTaskDetailQuery(context, this.externalDependencies)
  }

  override makeAuditLogs(context: TaskActionContext): GetTaskAuditLogsQuery {
    return new GetTaskAuditLogsQuery(context, this.externalDependencies)
  }

  override makeCreatePage(context: TaskActionContext): GetTaskCreatePageQuery {
    return new GetTaskCreatePageQuery(
      context,
      this.externalDependencies,
      this.readRepository,
      this.statusRepository
    )
  }

  override makeEditPage(context: TaskActionContext): GetTaskEditPageQuery {
    return new GetTaskEditPageQuery(
      context,
      this.externalDependencies,
      this.readRepository,
      this.statusRepository
    )
  }
}

export class ComposedTaskBoardQueryFactory extends TaskBoardQueryFactory {
  constructor(
    private readonly externalDependencies: TaskExternalDependencies,
    private readonly readRepository: TaskReadRepository,
    private readonly statusRepository: Pick<TaskStatusQueryRepositoryPort, 'findByOrganization'>
  ) {
    super()
  }

  override makeIndexPage(context: TaskActionContext): GetTasksIndexPageQuery {
    return new GetTasksIndexPageQuery(
      context,
      this.externalDependencies,
      this.readRepository,
      this.statusRepository
    )
  }

  override makeGrouped(context: TaskActionContext): GetTasksGroupedQuery {
    return new GetTasksGroupedQuery(
      context,
      this.externalDependencies,
      this.readRepository,
      this.statusRepository
    )
  }

  override makeTimeline(context: TaskActionContext): GetTasksTimelineQuery {
    return new GetTasksTimelineQuery(context, this.externalDependencies, this.readRepository)
  }
}
