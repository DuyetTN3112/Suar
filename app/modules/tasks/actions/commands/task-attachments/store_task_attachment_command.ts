import { BaseCommand } from '#modules/tasks/actions/base_command'
import CreateTaskAttachmentCommand, {
  type CreateTaskAttachmentDTO,
  type TaskAttachmentResult,
} from '#modules/tasks/actions/commands/task-attachments/create_task_attachment_command'
import UploadTaskAttachmentCommand, {
  type UploadTaskAttachmentDTO,
} from '#modules/tasks/actions/commands/task-attachments/upload_task_attachment_command'
import type { TaskAttachmentStorage } from '#modules/tasks/actions/ports/outbound/task_attachment_storage'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export type StoreTaskAttachmentInput =
  | { readonly kind: 'create'; readonly input: CreateTaskAttachmentDTO }
  | { readonly kind: 'upload'; readonly input: UploadTaskAttachmentDTO }

/**
 * Application boundary for the attachment transport variants.
 *
 * HTTP may receive either persisted-file metadata or a multipart upload, but
 * both are one user intent: store an attachment for a task. The transport
 * adapter selects the variant; this command owns the application dispatch.
 */
export default class StoreTaskAttachmentCommand extends BaseCommand<
  StoreTaskAttachmentInput,
  Record<string, unknown>
> {
  constructor(
    context: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies,
    private readonly storage: TaskAttachmentStorage
  ) {
    super(context, dependencies.transactions)
  }

  async execute(input: StoreTaskAttachmentInput): Promise<Record<string, unknown>> {
    return this.handle(input)
  }

  async handle(input: StoreTaskAttachmentInput): Promise<Record<string, unknown>> {
    if (input.kind === 'upload') {
      return new UploadTaskAttachmentCommand(this.execCtx, this.dependencies, this.storage).execute(
        input.input
      )
    }

    const result: TaskAttachmentResult = await new CreateTaskAttachmentCommand(
      this.execCtx,
      this.dependencies
    ).execute(input.input)
    return result as unknown as Record<string, unknown>
  }
}
