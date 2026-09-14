import { ReviewsTaskCompletionReviewPackageAccessAdapter } from '#composition/adapters/reviews/reviews_task_completion_review_package_access_adapter'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import CreateTaskAttachmentCommand from '#modules/tasks/actions/commands/task-attachments/create_task_attachment_command'
import DeleteTaskAttachmentCommand from '#modules/tasks/actions/commands/task-attachments/delete_task_attachment_command'
import StoreTaskAttachmentCommand from '#modules/tasks/actions/commands/task-attachments/store_task_attachment_command'
import UploadTaskAttachmentCommand from '#modules/tasks/actions/commands/task-attachments/upload_task_attachment_command'
import CreateTaskCommentCommand from '#modules/tasks/actions/commands/task-comments/create_task_comment_command'
import DeleteTaskCommentCommand from '#modules/tasks/actions/commands/task-comments/delete_task_comment_command'
import UpdateTaskCommentCommand from '#modules/tasks/actions/commands/task-comments/update_task_comment_command'
import AddTaskSubmissionEvidenceCommand from '#modules/tasks/actions/commands/task-submissions/add_task_submission_evidence_command'
import DeleteTaskSubmissionEvidenceCommand from '#modules/tasks/actions/commands/task-submissions/delete_task_submission_evidence_command'
import LockTaskSubmissionCommand from '#modules/tasks/actions/commands/task-submissions/lock_task_submission_command'
import {
  SaveTaskCompletionReportDraftCommand,
  SubmitTaskCompletionReportCommand,
  type TaskCompletionReportCommandDependencies,
} from '#modules/tasks/actions/commands/task-submissions/persist_task_completion_report_command'
import StartTaskCompletionReportCommand from '#modules/tasks/actions/commands/task-submissions/start_task_completion_report_command'
import SubmitTaskSubmissionCommand from '#modules/tasks/actions/commands/task-submissions/submit_task_submission_command'
import { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'
import type { TaskAttachmentStorage } from '#modules/tasks/actions/ports/outbound/task_attachment_storage'
import type { TaskCompletionReviewPackageAccessReader } from '#modules/tasks/actions/ports/outbound/task_completion_review_package_access_reader'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskSubmissionReviewGovernance } from '#modules/tasks/actions/ports/outbound/task_submission_review_governance'
import ListTaskAttachmentsQuery from '#modules/tasks/actions/queries/task-comments/list_task_attachments_query'
import ListTaskCommentsQuery from '#modules/tasks/actions/queries/task-comments/list_task_comments_query'
import GetTaskSubmissionQuery from '#modules/tasks/actions/queries/task-submissions/get_task_submission_query'
import ListTaskSubmissionEvidencesQuery from '#modules/tasks/actions/queries/task-submissions/list_task_submission_evidences_query'
import LoadTaskCompletionReportByAssignmentQuery from '#modules/tasks/actions/queries/task-submissions/load_task_completion_report_by_assignment_query'
import LoadTaskCompletionReviewPackageQuery from '#modules/tasks/actions/queries/task-submissions/load_task_completion_review_package_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { NodeTaskCompletionReportIdGenerator } from '#modules/tasks/infra/adapters/task-submissions/node_task_completion_report_id_generator'

export class ComposedTaskCompletionApplicationFactory extends TaskCompletionApplicationFactory {
  private readonly completionReportIdGenerator = new NodeTaskCompletionReportIdGenerator()

  constructor(
    private readonly externalDependencies: TaskExternalDependencies,
    private readonly reviewGovernance: TaskSubmissionReviewGovernance,
    private readonly notificationFanout: NotificationFanoutStagerContract,
    private readonly attachmentStorage: TaskAttachmentStorage,
    private readonly reviewPackageAccess: TaskCompletionReviewPackageAccessReader =
      new ReviewsTaskCompletionReviewPackageAccessAdapter()
  ) {
    super()
  }

  override makeGetSubmission(context: TaskActionContext): GetTaskSubmissionQuery {
    return new GetTaskSubmissionQuery(context, this.externalDependencies)
  }

  override makeStartCompletionReport(context: TaskActionContext): StartTaskCompletionReportCommand {
    const assignmentContract = this.externalDependencies.assignmentContract
    if (!assignmentContract) {
      throw new Error('Native Completion Report dependencies are not configured')
    }
    return new StartTaskCompletionReportCommand(context, {
      repository: this.externalDependencies.completion,
      assignmentContracts: assignmentContract.repository,
      transactions: this.externalDependencies.transactions,
    })
  }

  override makeGetCompletionReport(
    context: TaskActionContext
  ): LoadTaskCompletionReportByAssignmentQuery {
    const reports = this.externalDependencies.completionReports
    if (!reports) {
      throw new Error('Native Completion Report dependencies are not configured')
    }
    return new LoadTaskCompletionReportByAssignmentQuery(context, reports)
  }

  override makeGetCompletionReviewPackage(
    context: TaskActionContext
  ): LoadTaskCompletionReviewPackageQuery {
    const reports = this.externalDependencies.completionReports
    const assignmentContract = this.externalDependencies.assignmentContract
    if (!reports || !assignmentContract) {
      throw new Error('Native Completion Report dependencies are not configured')
    }
    return new LoadTaskCompletionReviewPackageQuery(context, {
      reports,
      assignmentContracts: assignmentContract.repository,
      access: this.reviewPackageAccess,
      hasher: assignmentContract.hasher,
    })
  }

  override makeSubmitSubmission(context: TaskActionContext): SubmitTaskSubmissionCommand {
    return new SubmitTaskSubmissionCommand(
      context,
      this.reviewGovernance,
      this.externalDependencies,
      this.notificationFanout
    )
  }

  private completionReportDependencies(): TaskCompletionReportCommandDependencies {
    const reports = this.externalDependencies.completionReports
    const assignmentContract = this.externalDependencies.assignmentContract
    if (!reports || !assignmentContract) {
      throw new Error('Native Completion Report dependencies are not configured')
    }

    return {
      repository: reports,
      assignmentContracts: assignmentContract.repository,
      transactions: this.externalDependencies.transactions,
      hasher: assignmentContract.hasher,
      idGenerator: this.completionReportIdGenerator,
    }
  }

  override makeSaveCompletionReportDraft(
    context: TaskActionContext
  ): SaveTaskCompletionReportDraftCommand {
    return new SaveTaskCompletionReportDraftCommand(
      context,
      this.completionReportDependencies()
    )
  }

  override makeSubmitCompletionReport(
    context: TaskActionContext
  ): SubmitTaskCompletionReportCommand {
    return new SubmitTaskCompletionReportCommand(context, this.completionReportDependencies())
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

  override makeStoreAttachment(context: TaskActionContext): StoreTaskAttachmentCommand {
    return new StoreTaskAttachmentCommand(
      context,
      this.externalDependencies,
      this.attachmentStorage
    )
  }

  override makeDeleteAttachment(context: TaskActionContext): DeleteTaskAttachmentCommand {
    return new DeleteTaskAttachmentCommand(context, this.externalDependencies)
  }
}
