import db from '@adonisjs/lucid/services/db'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export interface CreateTaskAttachmentDTO {
  task_id: string
  file_name: string
  file_path: string
  file_size?: number | null
  mime_type?: string | null
  attachment_type: 'requirement' | 'reference' | 'submission' | 'review' | 'other'
}

export interface TaskAttachmentResult extends CreateTaskAttachmentDTO {
  id: string
  uploaded_by: string
}

export default class CreateTaskAttachmentCommand {
  constructor(private execCtx: TaskActionContext) {}

  async execute(dto: CreateTaskAttachmentDTO): Promise<TaskAttachmentResult> {
    if (dto.file_name.trim().length === 0) {
      throw new BusinessLogicException('Task attachment file name is required')
    }

    if (dto.file_path.trim().length === 0) {
      throw new BusinessLogicException('Task attachment file path is required')
    }

    const task = await loadTaskForCompletionPackage(dto.task_id)
    const actorId = await assertTaskCompletionPackageAccess(this.execCtx, task)

    const [created] = (await db
      .table('task_attachments')
      .insert({
        task_id: dto.task_id,
        file_name: dto.file_name.trim(),
        file_path: dto.file_path.trim(),
        file_size: dto.file_size ?? null,
        mime_type: dto.mime_type ?? null,
        uploaded_by: actorId,
        attachment_type: dto.attachment_type,
      })
      .returning('*')) as Record<string, unknown>[]

    return created as unknown as TaskAttachmentResult
  }
}
