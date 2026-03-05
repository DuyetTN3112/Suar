import { makeCompleteTaskAssignmentsCommand } from '#composition/task_completion_transition_composition'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import AddTaskSubmissionEvidenceCommand from '#modules/tasks/actions/commands/add_task_submission_evidence_command'
import BatchUpdateTaskStatusCommand from '#modules/tasks/actions/commands/batch_update_task_status_command'
import CreateTaskAttachmentCommand from '#modules/tasks/actions/commands/create_task_attachment_command'
import CreateTaskCommand from '#modules/tasks/actions/commands/create_task_command'
import CreateTaskCommentCommand from '#modules/tasks/actions/commands/create_task_comment_command'
import CreateTaskStatusCommand from '#modules/tasks/actions/commands/create_task_status_command'
import DeleteTaskAttachmentCommand from '#modules/tasks/actions/commands/delete_task_attachment_command'
import DeleteTaskCommand from '#modules/tasks/actions/commands/delete_task_command'
import DeleteTaskCommentCommand from '#modules/tasks/actions/commands/delete_task_comment_command'
import DeleteTaskStatusCommand from '#modules/tasks/actions/commands/delete_task_status_command'
import DeleteTaskSubmissionEvidenceCommand from '#modules/tasks/actions/commands/delete_task_submission_evidence_command'
import LockTaskSubmissionCommand from '#modules/tasks/actions/commands/lock_task_submission_command'
import ReplaceTaskWorkflowTransitionsCommand from '#modules/tasks/actions/commands/replace_task_workflow_transitions_command'
import SubmitTaskSubmissionCommand from '#modules/tasks/actions/commands/submit_task_submission_command'
import UpdateTaskCommand from '#modules/tasks/actions/commands/update_task_command'
import UpdateTaskCommentCommand from '#modules/tasks/actions/commands/update_task_comment_command'
import UpdateTaskSortOrderCommand from '#modules/tasks/actions/commands/update_task_sort_order_command'
import UpdateTaskStatusCommand from '#modules/tasks/actions/commands/update_task_status_command'
import UpdateTaskStatusDefinitionCommand from '#modules/tasks/actions/commands/update_task_status_definition_command'
import UpdateTaskTimeCommand from '#modules/tasks/actions/commands/update_task_time_command'
import UploadTaskAttachmentCommand from '#modules/tasks/actions/commands/upload_task_attachment_command'
import { TaskBoardQueryFactory } from '#modules/tasks/actions/ports/inbound/task_board_query_factory'
import { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'
import { TaskDetailQueryFactory } from '#modules/tasks/actions/ports/inbound/task_detail_query_factory'
import { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'
import { TaskStatusDefinitionCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_definition_command_factory'
import { TaskStatusWorkflowCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_workflow_command_factory'
import type { TaskAttachmentStorage } from '#modules/tasks/actions/ports/outbound/task_attachment_storage'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskReadRepository } from '#modules/tasks/actions/ports/outbound/task_read_repository'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import type { TaskStatusReviewReader } from '#modules/tasks/actions/ports/outbound/task_status_review_reader'
import type { TaskSubmissionReviewGovernance } from '#modules/tasks/actions/ports/outbound/task_submission_review_governance'
import GetTaskAuditLogsQuery from '#modules/tasks/actions/queries/get_task_audit_logs_query'
import GetTaskCreatePageQuery from '#modules/tasks/actions/queries/get_task_create_page_query'
import GetTaskDetailQuery from '#modules/tasks/actions/queries/get_task_detail_query'
import GetTaskEditPageQuery from '#modules/tasks/actions/queries/get_task_edit_page_query'
import GetTaskSubmissionQuery from '#modules/tasks/actions/queries/get_task_submission_query'
import GetTasksGroupedQuery from '#modules/tasks/actions/queries/get_tasks_grouped_query'
import GetTasksIndexPageQuery from '#modules/tasks/actions/queries/get_tasks_index_page_query'
import GetTasksTimelineQuery from '#modules/tasks/actions/queries/get_tasks_timeline_query'
import ListTaskAttachmentsQuery from '#modules/tasks/actions/queries/list_task_attachments_query'
import ListTaskCommentsQuery from '#modules/tasks/actions/queries/list_task_comments_query'
import ListTaskSubmissionEvidencesQuery from '#modules/tasks/actions/queries/list_task_submission_evidences_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export class ComposedTaskCompletionApplicationFactory extends TaskCompletionApplicationFactory {
  constructor(
    private readonly externalDependencies: TaskExternalDependencies,
    private readonly reviewGovernance: TaskSubmissionReviewGovernance,
    private readonly notificationFanout: NotificationFanoutStagerContract,
    private readonly attachmentStorage: TaskAttachmentStorage
  ) {
    super()
  }

  override makeGetSubmission(context: TaskActionContext): GetTaskSubmissionQuery {
    return new GetTaskSubmissionQuery(context, this.externalDependencies)
  }

  override makeSubmitSubmission(context: TaskActionContext): SubmitTaskSubmissionCommand {
    return new SubmitTaskSubmissionCommand(
      context,
      this.reviewGovernance,
      this.externalDependencies,
      this.notificationFanout
    )
  }

  override makeLockSubmission(context: TaskActionContext): LockTaskSubmissionCommand {
    return new LockTaskSubmissionCommand(context, this.externalDependencies)
  }

  override makeListEvidences(context: TaskActionContext): ListTaskSubmissionEvidencesQuery {
    return new ListTaskSubmissionEvidencesQuery(context, this.externalDependencies)
  }

  override makeAddEvidence(context: TaskActionContext): AddTaskSubmissionEvidenceCommand {
    return new AddTaskSubmissionEvidenceCommand(context, this.externalDependencies)
  }

  override makeDeleteEvidence(context: TaskActionContext): DeleteTaskSubmissionEvidenceCommand {
    return new DeleteTaskSubmissionEvidenceCommand(context, this.externalDependencies)
  }

  override makeListComments(context: TaskActionContext): ListTaskCommentsQuery {
    return new ListTaskCommentsQuery(context, this.externalDependencies)
  }

  override makeCreateComment(context: TaskActionContext): CreateTaskCommentCommand {
    return new CreateTaskCommentCommand(context, this.externalDependencies, this.notificationFanout)
  }

  override makeUpdateComment(context: TaskActionContext): UpdateTaskCommentCommand {
    return new UpdateTaskCommentCommand(context, this.externalDependencies, this.notificationFanout)
  }

  override makeDeleteComment(context: TaskActionContext): DeleteTaskCommentCommand {
    return new DeleteTaskCommentCommand(context, this.externalDependencies)
  }

  override makeListAttachments(context: TaskActionContext): ListTaskAttachmentsQuery {
    return new ListTaskAttachmentsQuery(context, this.externalDependencies)
  }

  override makeCreateAttachment(context: TaskActionContext): CreateTaskAttachmentCommand {
    return new CreateTaskAttachmentCommand(context, this.externalDependencies)
  }

  override makeUploadAttachment(context: TaskActionContext): UploadTaskAttachmentCommand {
    return new UploadTaskAttachmentCommand(
      context,
      this.externalDependencies,
      this.attachmentStorage
    )
  }

  override makeDeleteAttachment(context: TaskActionContext): DeleteTaskAttachmentCommand {
    return new DeleteTaskAttachmentCommand(context, this.externalDependencies)
  }
}

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
