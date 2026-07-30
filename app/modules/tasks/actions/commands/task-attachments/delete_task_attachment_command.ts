import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/task_completion_package_access'

export interface DeleteTaskAttachmentDTO {
  attachment_id: string
}

export default class DeleteTaskAttachmentCommand extends BaseCommand<DeleteTaskAttachmentDTO, void> {
  constructor(
    protected override execCtx: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {
    super(execCtx, dependencies.transactions)
  }

  override async handle(dto: DeleteTaskAttachmentDTO): Promise<void> {
    return this.execute(dto)
  }

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
