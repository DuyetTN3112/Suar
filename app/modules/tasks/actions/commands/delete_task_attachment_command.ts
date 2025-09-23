import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export interface DeleteTaskAttachmentDTO {
  attachment_id: string
}

export default class DeleteTaskAttachmentCommand {
  constructor(private execCtx: TaskActionContext) {}

  async execute(dto: DeleteTaskAttachmentDTO): Promise<void> {
    const attachment = (await db
      .from('task_attachments')
      .where('id', dto.attachment_id)
      .whereNull('deleted_at')
      .first()) as { task_id: string; uploaded_by: string } | undefined
    if (!attachment) {
      throw new NotFoundException('Task attachment not found')
    }

    const task = await loadTaskForCompletionPackage(attachment.task_id)
    await assertTaskCompletionPackageAccess(this.execCtx, task, [attachment.uploaded_by])

    await db
      .from('task_attachments')
      .where('id', dto.attachment_id)
      .update({ deleted_at: DateTime.now().toSQL() })
  }
}
