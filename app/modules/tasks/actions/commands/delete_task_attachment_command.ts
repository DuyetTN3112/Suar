import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/services/task_completion_access_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export interface DeleteTaskAttachmentDTO {
  attachment_id: string
}

export default class DeleteTaskAttachmentCommand {
  constructor(
    private execCtx: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {}

  async execute(dto: DeleteTaskAttachmentDTO): Promise<void> {
    const attachment = await this.dependencies.completion.findAttachment(dto.attachment_id)
    if (!attachment) {
      throw new NotFoundException('Task attachment not found')
    }

    const task = await loadTaskForCompletionPackage(
      attachment.task_id,
      this.dependencies.completion
    )
    await assertTaskCompletionPackageAccess(
      this.execCtx,
      task,
      [attachment.uploaded_by],
      this.dependencies.org
    )

    await this.dependencies.completion.softDeleteAttachment(dto.attachment_id, new Date())
  }
}
