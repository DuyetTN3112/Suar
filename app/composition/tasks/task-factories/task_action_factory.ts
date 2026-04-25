import { makeCompleteTaskAssignmentsCommand } from '#composition/tasks/task-completion/task_completion_transition_composition'
import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import { taskOrganizationMembershipWriter } from '#composition/organizations/tasks/task_organization_membership_composition'
import { makeGetTasksListQuery as makePortBackedGetTasksListQuery } from '#composition/tasks/task-reading/task_query_factory'
import ApplyForTaskCommand from '#modules/tasks/actions/commands/task-applications/apply_for_task_command'
import AssignTaskCommand from '#modules/tasks/actions/commands/task-assignment/assign_task_command'
import BatchUpdateTaskStatusCommand from '#modules/tasks/actions/commands/task-status/batch_update_task_status_command'
import CreateTaskCommand from '#modules/tasks/actions/commands/task-authoring/create_task_command'
import DeleteTaskCommand from '#modules/tasks/actions/commands/task-authoring/delete_task_command'
import DeleteTaskStatusCommand from '#modules/tasks/actions/commands/task-status/delete_task_status_command'
import ProcessApplicationCommand from '#modules/tasks/actions/commands/task-applications/process_application_command'
import UpdateTaskCommand from '#modules/tasks/actions/commands/task-authoring/update_task_command'
import UpdateTaskSortOrderCommand from '#modules/tasks/actions/commands/task-authoring/update_task_sort_order_command'
import UpdateTaskStatusCommand from '#modules/tasks/actions/commands/task-status/update_task_status_command'
import UpdateTaskTimeCommand from '#modules/tasks/actions/commands/task-authoring/update_task_time_command'
import WithdrawApplicationCommand from '#modules/tasks/actions/commands/task-applications/withdraw_application_command'
import type { TaskPermissionReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import GetMyApplicationsQuery from '#modules/tasks/actions/queries/task-applications/get_my_applications_query'
import GetOrganizationTaskApplicationsQuery from '#modules/tasks/actions/queries/task-applications/get_organization_task_applications_query'
import GetTaskApplicationsQuery from '#modules/tasks/actions/queries/task-applications/get_task_applications_query'
import GetTaskAuditLogsQuery from '#modules/tasks/actions/queries/task-authoring/get_task_audit_logs_query'
import GetTaskCreatePageQuery from '#modules/tasks/actions/queries/task-authoring/get_task_create_page_query'
import GetTaskDetailQuery from '#modules/tasks/actions/queries/task-reading/get_task_detail_query'
import GetTaskEditPageQuery from '#modules/tasks/actions/queries/task-reading/get_task_edit_page_query'
import GetTaskMetadataQuery from '#modules/tasks/actions/queries/task-reading/get_task_metadata_query'
import GetTaskProjectsQuery from '#modules/tasks/actions/queries/task-reading/get_task_projects_query'
import GetTaskStatisticsQuery from '#modules/tasks/actions/queries/task-reading/get_task_statistics_query'
import GetTasksGroupedQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_grouped_query'
import GetTasksIndexPageQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_index_page_query'
import type GetTasksListQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_list_query'
import GetTasksPageQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_page_query'
import GetTasksTimelineQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_timeline_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { InProcessTaskEventPublisher } from '#modules/tasks/infra/adapters/task-authoring/in_process_task_event_publisher'
import { LucidTaskReadRepository } from '#modules/tasks/infra/adapters/task-reading/lucid_task_read_repository'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'
import { taskStatusQueryRepository } from '#modules/tasks/infra/repositories/task-status/read/task_status_query_repository'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task-applications/task_application_repository'

const taskCache = new TaskCacheInvalidator()
const taskReadRepository = new LucidTaskReadRepository()
const taskEvents = new InProcessTaskEventPublisher()

export function makeApplyForTaskCommand(
  execCtx: TaskActionContext,
  notificationStager: TaskNotificationStager
): ApplyForTaskCommand {
  return new ApplyForTaskCommand(
    execCtx,
    taskExternalDeps,
    taskCache,
    taskEvents,
    notificationStager
  )
}

export function makeProcessApplicationCommand(
  execCtx: TaskActionContext,
  notificationStager: TaskNotificationStager
): ProcessApplicationCommand {
  return new ProcessApplicationCommand(
    execCtx,
    taskCache,
    taskEvents,
    notificationStager,
    taskOrganizationMembershipWriter,
    taskExternalDeps.permission,
    taskExternalDeps
  )
}

export function makeWithdrawApplicationCommand(
  execCtx: TaskActionContext
): WithdrawApplicationCommand {
  return new WithdrawApplicationCommand(execCtx, taskCache, taskExternalDeps)
}

export function makeGetTaskApplicationsQuery(execCtx: TaskActionContext): GetTaskApplicationsQuery {
  return new GetTaskApplicationsQuery(
    execCtx,
    taskExternalDeps.permission,
    taskExternalDeps.lifecycle,
    {},
    taskExternalDeps.user
  )
}

export function makeGetMyApplicationsQuery(execCtx: TaskActionContext): GetMyApplicationsQuery {
  return new GetMyApplicationsQuery(execCtx, taskExternalDeps.lifecycle, {
    paginateByApplicant: (applicantId, options) =>
      TaskApplicationRepository.paginateByApplicant(
        applicantId,
        options,
        undefined,
        taskExternalDeps.org,
        taskExternalDeps.project
      ),
  })
}

export function makeGetOrganizationTaskApplicationsQuery(
  execCtx: TaskActionContext
): GetOrganizationTaskApplicationsQuery {
  return new GetOrganizationTaskApplicationsQuery(
    execCtx,
    taskExternalDeps.permission,
    taskExternalDeps.lifecycle,
    {},
    taskExternalDeps.user
  )
}

export function makeBatchUpdateTaskStatusCommand(
  execCtx: TaskActionContext
): BatchUpdateTaskStatusCommand {
  return new BatchUpdateTaskStatusCommand(
    execCtx,
    taskExternalDeps,
    taskCache,
    taskEvents,
    makeCompleteTaskAssignmentsCommand(taskExternalDeps)
  )
}

export function makeCreateTaskCommand(
  execCtx: TaskActionContext,
  notificationStager: TaskNotificationStager
): CreateTaskCommand {
  return new CreateTaskCommand(execCtx, taskExternalDeps, notificationStager, taskCache, taskEvents)
}

export function makeUpdateTaskCommand(
  execCtx: TaskActionContext,
  notificationStager: TaskNotificationStager
): UpdateTaskCommand {
  return new UpdateTaskCommand(execCtx, taskExternalDeps, notificationStager, taskCache, taskEvents)
}

export function makeAssignTaskCommand(
  execCtx: TaskActionContext,
  notificationStager: TaskNotificationStager
): AssignTaskCommand {
  return new AssignTaskCommand(execCtx, notificationStager, taskExternalDeps, taskCache, taskEvents)
}

export function makeDeleteTaskCommand(
  execCtx: TaskActionContext,
  notificationStager: TaskNotificationStager
): DeleteTaskCommand {
  return new DeleteTaskCommand(execCtx, taskExternalDeps, notificationStager, taskCache, taskEvents)
}

export function makeDeleteTaskStatusCommand(execCtx: TaskActionContext): DeleteTaskStatusCommand {
  return new DeleteTaskStatusCommand(execCtx, taskExternalDeps.review, taskCache, taskExternalDeps)
}

export function makeUpdateTaskSortOrderCommand(
  execCtx: TaskActionContext
): UpdateTaskSortOrderCommand {
  return new UpdateTaskSortOrderCommand(
    execCtx,
    taskExternalDeps,
    taskCache,
    taskEvents,
    makeCompleteTaskAssignmentsCommand(taskExternalDeps)
  )
}

export function makeUpdateTaskStatusCommand(
  execCtx: TaskActionContext,
  notificationStager: TaskNotificationStager
): UpdateTaskStatusCommand {
  return new UpdateTaskStatusCommand(
    execCtx,
    taskExternalDeps,
    notificationStager,
    taskCache,
    taskEvents,
    makeCompleteTaskAssignmentsCommand(taskExternalDeps)
  )
}

export function makeUpdateTaskTimeCommand(execCtx: TaskActionContext): UpdateTaskTimeCommand {
  return new UpdateTaskTimeCommand(execCtx, taskExternalDeps, taskCache, taskEvents)
}

export function getTaskPermissionReader(): TaskPermissionReader {
  return taskExternalDeps.permission
}

export function makeGetTaskDetailQuery(execCtx: TaskActionContext): GetTaskDetailQuery {
  return new GetTaskDetailQuery(execCtx, taskExternalDeps)
}

export function makeGetTaskAuditLogsQuery(execCtx: TaskActionContext): GetTaskAuditLogsQuery {
  return new GetTaskAuditLogsQuery(execCtx, taskExternalDeps)
}

export function makeGetTaskCreatePageQuery(execCtx: TaskActionContext): GetTaskCreatePageQuery {
  return new GetTaskCreatePageQuery(
    execCtx,
    taskExternalDeps,
    taskReadRepository,
    taskStatusQueryRepository
  )
}

export function makeGetTaskEditPageQuery(execCtx: TaskActionContext): GetTaskEditPageQuery {
  return new GetTaskEditPageQuery(
    execCtx,
    taskExternalDeps,
    taskReadRepository,
    taskStatusQueryRepository
  )
}

export function makeGetTaskMetadataQuery(execCtx: TaskActionContext): GetTaskMetadataQuery {
  return new GetTaskMetadataQuery(
    execCtx,
    taskExternalDeps,
    taskReadRepository,
    taskStatusQueryRepository
  )
}

export function makeGetTaskProjectsQuery(): GetTaskProjectsQuery {
  return new GetTaskProjectsQuery(taskExternalDeps.project)
}

export function makeGetTaskStatisticsQuery(execCtx: TaskActionContext): GetTaskStatisticsQuery {
  return new GetTaskStatisticsQuery(execCtx, taskExternalDeps, taskReadRepository)
}

export function makeGetTasksGroupedQuery(execCtx: TaskActionContext): GetTasksGroupedQuery {
  return new GetTasksGroupedQuery(
    execCtx,
    taskExternalDeps,
    taskReadRepository,
    taskStatusQueryRepository
  )
}

export function makeGetTasksListQuery(execCtx: TaskActionContext): GetTasksListQuery {
  return makePortBackedGetTasksListQuery(execCtx, taskExternalDeps)
}

export function makeGetTasksIndexPageQuery(execCtx: TaskActionContext): GetTasksIndexPageQuery {
  return new GetTasksIndexPageQuery(
    execCtx,
    taskExternalDeps,
    taskReadRepository,
    taskStatusQueryRepository
  )
}

export function makeGetTasksPageQuery(execCtx: TaskActionContext): GetTasksPageQuery {
  return new GetTasksPageQuery(
    execCtx,
    taskExternalDeps,
    taskReadRepository,
    taskStatusQueryRepository
  )
}

export function makeGetTasksTimelineQuery(execCtx: TaskActionContext): GetTasksTimelineQuery {
  return new GetTasksTimelineQuery(execCtx, taskExternalDeps, taskReadRepository)
}
