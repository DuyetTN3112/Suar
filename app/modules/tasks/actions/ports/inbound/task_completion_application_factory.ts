import type AddTaskSubmissionEvidenceCommand from '#modules/tasks/actions/commands/add_task_submission_evidence_command'
import type CreateTaskAttachmentCommand from '#modules/tasks/actions/commands/create_task_attachment_command'
import type CreateTaskCommentCommand from '#modules/tasks/actions/commands/create_task_comment_command'
import type DeleteTaskAttachmentCommand from '#modules/tasks/actions/commands/delete_task_attachment_command'
import type DeleteTaskCommentCommand from '#modules/tasks/actions/commands/delete_task_comment_command'
import type DeleteTaskSubmissionEvidenceCommand from '#modules/tasks/actions/commands/delete_task_submission_evidence_command'
import type LockTaskSubmissionCommand from '#modules/tasks/actions/commands/lock_task_submission_command'
import type SubmitTaskSubmissionCommand from '#modules/tasks/actions/commands/submit_task_submission_command'
import type UpdateTaskCommentCommand from '#modules/tasks/actions/commands/update_task_comment_command'
import type UploadTaskAttachmentCommand from '#modules/tasks/actions/commands/upload_task_attachment_command'
import type GetTaskSubmissionQuery from '#modules/tasks/actions/queries/get_task_submission_query'
import type ListTaskAttachmentsQuery from '#modules/tasks/actions/queries/list_task_attachments_query'
import type ListTaskCommentsQuery from '#modules/tasks/actions/queries/list_task_comments_query'
import type ListTaskSubmissionEvidencesQuery from '#modules/tasks/actions/queries/list_task_submission_evidences_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export abstract class TaskCompletionApplicationFactory {
  abstract makeGetSubmission(context: TaskActionContext): GetTaskSubmissionQuery
  abstract makeSubmitSubmission(context: TaskActionContext): SubmitTaskSubmissionCommand
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
  abstract makeDeleteAttachment(context: TaskActionContext): DeleteTaskAttachmentCommand
}
