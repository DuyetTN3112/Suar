import type CreateTaskAttachmentCommand from '#modules/tasks/actions/commands/task-attachments/create_task_attachment_command'
import type DeleteTaskAttachmentCommand from '#modules/tasks/actions/commands/task-attachments/delete_task_attachment_command'
import type StoreTaskAttachmentCommand from '#modules/tasks/actions/commands/task-attachments/store_task_attachment_command'
import type UploadTaskAttachmentCommand from '#modules/tasks/actions/commands/task-attachments/upload_task_attachment_command'
import type CreateTaskCommentCommand from '#modules/tasks/actions/commands/task-comments/create_task_comment_command'
import type DeleteTaskCommentCommand from '#modules/tasks/actions/commands/task-comments/delete_task_comment_command'
import type UpdateTaskCommentCommand from '#modules/tasks/actions/commands/task-comments/update_task_comment_command'
import type AddTaskSubmissionEvidenceCommand from '#modules/tasks/actions/commands/task-submissions/add_task_submission_evidence_command'
import type DeleteTaskSubmissionEvidenceCommand from '#modules/tasks/actions/commands/task-submissions/delete_task_submission_evidence_command'
import type LockTaskSubmissionCommand from '#modules/tasks/actions/commands/task-submissions/lock_task_submission_command'
import {
  type SaveTaskCompletionReportDraftCommand,
  type SubmitTaskCompletionReportCommand,
} from '#modules/tasks/actions/commands/task-submissions/persist_task_completion_report_command'
import type StartTaskCompletionReportCommand from '#modules/tasks/actions/commands/task-submissions/start_task_completion_report_command'
import type SubmitTaskSubmissionCommand from '#modules/tasks/actions/commands/task-submissions/submit_task_submission_command'
import type ListTaskAttachmentsQuery from '#modules/tasks/actions/queries/task-comments/list_task_attachments_query'
import type ListTaskCommentsQuery from '#modules/tasks/actions/queries/task-comments/list_task_comments_query'
import type GetTaskSubmissionQuery from '#modules/tasks/actions/queries/task-submissions/get_task_submission_query'
import type ListTaskSubmissionEvidencesQuery from '#modules/tasks/actions/queries/task-submissions/list_task_submission_evidences_query'
import type LoadTaskCompletionReportByAssignmentQuery from '#modules/tasks/actions/queries/task-submissions/load_task_completion_report_by_assignment_query'
import type LoadTaskCompletionReviewPackageQuery from '#modules/tasks/actions/queries/task-submissions/load_task_completion_review_package_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export abstract class TaskCompletionApplicationFactory {
  abstract makeGetSubmission(context: TaskActionContext): GetTaskSubmissionQuery
  abstract makeStartCompletionReport(context: TaskActionContext): StartTaskCompletionReportCommand
  abstract makeGetCompletionReport(
    context: TaskActionContext
  ): LoadTaskCompletionReportByAssignmentQuery
  abstract makeGetCompletionReviewPackage(
    context: TaskActionContext
  ): LoadTaskCompletionReviewPackageQuery
  abstract makeSubmitSubmission(context: TaskActionContext): SubmitTaskSubmissionCommand
  abstract makeSaveCompletionReportDraft(
    context: TaskActionContext
  ): SaveTaskCompletionReportDraftCommand
  abstract makeSubmitCompletionReport(context: TaskActionContext): SubmitTaskCompletionReportCommand
  abstract makeLockSubmission(context: TaskActionContext): LockTaskSubmissionCommand
  abstract makeListEvidences(context: TaskActionContext): ListTaskSubmissionEvidencesQuery
  abstract makeAddEvidence(context: TaskActionContext): AddTaskSubmissionEvidenceCommand
  abstract makeDeleteEvidence(context: TaskActionContext): DeleteTaskSubmissionEvidenceCommand
  abstract makeListComments(context: TaskActionContext): ListTaskCommentsQuery
  abstract makeCreateComment(context: TaskActionContext): CreateTaskCommentCommand
  abstract makeUpdateComment(context: TaskActionContext): UpdateTaskCommentCommand
  abstract makeDeleteComment(context: TaskActionContext): DeleteTaskCommentCommand
  abstract makeListAttachments(context: TaskActionContext): ListTaskAttachmentsQuery
  abstract makeCreateAttachment(context: TaskActionContext): CreateTaskAttachmentCommand
  abstract makeUploadAttachment(context: TaskActionContext): UploadTaskAttachmentCommand
  abstract makeStoreAttachment(context: TaskActionContext): StoreTaskAttachmentCommand
  abstract makeDeleteAttachment(context: TaskActionContext): DeleteTaskAttachmentCommand
}
