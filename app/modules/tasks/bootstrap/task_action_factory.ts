import { notificationPublicApi, type NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import ApplyForTaskCommand from '#modules/tasks/actions/commands/apply_for_task_command'
import AssignTaskCommand from '#modules/tasks/actions/commands/assign_task_command'
import BatchUpdateTaskStatusCommand from '#modules/tasks/actions/commands/batch_update_task_status_command'
import CreateTaskCommand from '#modules/tasks/actions/commands/create_task_command'
import DeleteTaskCommand from '#modules/tasks/actions/commands/delete_task_command'
import DeleteTaskStatusCommand from '#modules/tasks/actions/commands/delete_task_status_command'
import PatchTaskStatusBoardPocCommand from '#modules/tasks/actions/commands/patch_task_status_board_poc_command'
import ProcessApplicationCommand from '#modules/tasks/actions/commands/process_application_command'
import RevokeTaskAccessCommand from '#modules/tasks/actions/commands/revoke_task_access_command'
import UpdateTaskCommand from '#modules/tasks/actions/commands/update_task_command'
import UpdateTaskSortOrderCommand from '#modules/tasks/actions/commands/update_task_sort_order_command'
import UpdateTaskStatusCommand from '#modules/tasks/actions/commands/update_task_status_command'
import UpdateTaskTimeCommand from '#modules/tasks/actions/commands/update_task_time_command'
import WithdrawApplicationCommand from '#modules/tasks/actions/commands/withdraw_application_command'
import type { TaskPermissionReader } from '#modules/tasks/actions/ports/task_external_dependencies'
import GetTaskCreatePageQuery from '#modules/tasks/actions/queries/get_task_create_page_query'
import GetTaskDetailQuery from '#modules/tasks/actions/queries/get_task_detail_query'
import GetTaskEditPageQuery from '#modules/tasks/actions/queries/get_task_edit_page_query'
import GetTaskMetadataQuery from '#modules/tasks/actions/queries/get_task_metadata_query'
import GetTaskProjectsQuery from '#modules/tasks/actions/queries/get_task_projects_query'
import GetTaskStatisticsQuery from '#modules/tasks/actions/queries/get_task_statistics_query'
import GetTaskStatusBoardPageQuery from '#modules/tasks/actions/queries/get_task_status_board_page_query'
import GetTasksGroupedQuery from '#modules/tasks/actions/queries/get_tasks_grouped_query'
import GetTasksIndexPageQuery from '#modules/tasks/actions/queries/get_tasks_index_page_query'
import GetTasksListQuery from '#modules/tasks/actions/queries/get_tasks_list_query'
import GetTasksPageQuery from '#modules/tasks/actions/queries/get_tasks_page_query'
import GetTasksTimelineQuery from '#modules/tasks/actions/queries/get_tasks_timeline_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskExternalDeps } from '#modules/tasks/bootstrap/task_composition_root'
import { TaskCacheInvalidator } from '#modules/tasks/infra/cache/task_cache_invalidator'

const taskCache = new TaskCacheInvalidator()

export function makeApplyForTaskCommand(execCtx: TaskActionContext): ApplyForTaskCommand {
  return new ApplyForTaskCommand(execCtx, taskExternalDeps, taskCache)
}

export function makeProcessApplicationCommand(execCtx: TaskActionContext): ProcessApplicationCommand {
  return new ProcessApplicationCommand(execCtx, taskCache)
}

export function makeWithdrawApplicationCommand(execCtx: TaskActionContext): WithdrawApplicationCommand {
  return new WithdrawApplicationCommand(execCtx, taskCache)
}

export function makeBatchUpdateTaskStatusCommand(
  execCtx: TaskActionContext
): BatchUpdateTaskStatusCommand {
  return new BatchUpdateTaskStatusCommand(execCtx, taskCache)
}

export function makeCreateTaskCommand(execCtx: TaskActionContext): CreateTaskCommand {
  return new CreateTaskCommand(execCtx, taskExternalDeps, notificationPublicApi, taskCache)
}

export function makeUpdateTaskCommand(execCtx: TaskActionContext): UpdateTaskCommand {
  return new UpdateTaskCommand(execCtx, taskExternalDeps, notificationPublicApi, taskCache)
}

export function makeAssignTaskCommand(
  execCtx: TaskActionContext,
  createNotification: NotificationCreator = notificationPublicApi
): AssignTaskCommand {
  return new AssignTaskCommand(execCtx, createNotification, taskExternalDeps, taskCache)
}

export function makeDeleteTaskCommand(execCtx: TaskActionContext): DeleteTaskCommand {
  return new DeleteTaskCommand(execCtx, taskExternalDeps, notificationPublicApi, taskCache)
}

export function makeDeleteTaskStatusCommand(execCtx: TaskActionContext): DeleteTaskStatusCommand {
  return new DeleteTaskStatusCommand(execCtx, taskExternalDeps)
}

export function makePatchTaskStatusBoardPocCommand(
  execCtx: TaskActionContext
): PatchTaskStatusBoardPocCommand {
  return new PatchTaskStatusBoardPocCommand(execCtx, taskExternalDeps)
}

export function makeRevokeTaskAccessCommand(
  execCtx: TaskActionContext,
  createNotification: NotificationCreator
): RevokeTaskAccessCommand {
  return new RevokeTaskAccessCommand(execCtx, createNotification, taskExternalDeps, taskCache)
}

export function makeUpdateTaskSortOrderCommand(
  execCtx: TaskActionContext
): UpdateTaskSortOrderCommand {
  return new UpdateTaskSortOrderCommand(execCtx, taskExternalDeps, taskCache)
}

export function makeUpdateTaskStatusCommand(execCtx: TaskActionContext): UpdateTaskStatusCommand {
  return new UpdateTaskStatusCommand(execCtx, taskExternalDeps, notificationPublicApi, taskCache)
}

export function makeUpdateTaskTimeCommand(execCtx: TaskActionContext): UpdateTaskTimeCommand {
  return new UpdateTaskTimeCommand(execCtx, taskExternalDeps, taskCache)
}

export function getTaskPermissionReader(): TaskPermissionReader {
  return taskExternalDeps.permission
}

export function makeGetTaskDetailQuery(execCtx: TaskActionContext): GetTaskDetailQuery {
  return new GetTaskDetailQuery(execCtx, taskExternalDeps)
}

export function makeGetTaskCreatePageQuery(execCtx: TaskActionContext): GetTaskCreatePageQuery {
  return new GetTaskCreatePageQuery(execCtx, taskExternalDeps)
}

export function makeGetTaskEditPageQuery(execCtx: TaskActionContext): GetTaskEditPageQuery {
  return new GetTaskEditPageQuery(execCtx, taskExternalDeps)
}

export function makeGetTaskMetadataQuery(execCtx: TaskActionContext): GetTaskMetadataQuery {
  return new GetTaskMetadataQuery(execCtx, taskExternalDeps)
}

export function makeGetTaskProjectsQuery(): GetTaskProjectsQuery {
  return new GetTaskProjectsQuery(taskExternalDeps.project)
}

export function makeGetTaskStatisticsQuery(execCtx: TaskActionContext): GetTaskStatisticsQuery {
  return new GetTaskStatisticsQuery(execCtx, taskExternalDeps)
}

export function makeGetTaskStatusBoardPageQuery(
  execCtx: TaskActionContext
): GetTaskStatusBoardPageQuery {
  return new GetTaskStatusBoardPageQuery(execCtx, taskExternalDeps)
}

export function makeGetTasksGroupedQuery(execCtx: TaskActionContext): GetTasksGroupedQuery {
  return new GetTasksGroupedQuery(execCtx, taskExternalDeps)
}

export function makeGetTasksListQuery(execCtx: TaskActionContext): GetTasksListQuery {
  return new GetTasksListQuery(execCtx, taskExternalDeps)
}

export function makeGetTasksIndexPageQuery(execCtx: TaskActionContext): GetTasksIndexPageQuery {
  return new GetTasksIndexPageQuery(execCtx, taskExternalDeps)
}

export function makeGetTasksPageQuery(execCtx: TaskActionContext): GetTasksPageQuery {
  return new GetTasksPageQuery(execCtx, taskExternalDeps)
}

export function makeGetTasksTimelineQuery(execCtx: TaskActionContext): GetTasksTimelineQuery {
  return new GetTasksTimelineQuery(execCtx, taskExternalDeps)
}
