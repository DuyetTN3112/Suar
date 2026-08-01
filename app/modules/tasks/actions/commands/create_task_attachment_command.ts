import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/services/task_completion_access_resolver'
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

const VALID_ATTACHMENT_TYPES = new Set([
  'requirement',
  'reference',
  'submission',
  'review',
  'other',
])

export default class CreateTaskAttachmentCommand {
  constructor(
    private execCtx: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {}

  async execute(dto: CreateTaskAttachmentDTO): Promise<TaskAttachmentResult> {
    if (dto.file_name.trim().length === 0) {
      throw ValidationException.field('file_name', 'Task attachment file name is required')
    }

    if (dto.file_path.trim().length === 0) {
      throw ValidationException.field('file_path', 'Task attachment file path is required')
    }

    if (dto.file_size !== undefined && dto.file_size !== null && dto.file_size < 0) {
      throw ValidationException.field('file_size', 'Task attachment file size cannot be negative')
    }

    if (!VALID_ATTACHMENT_TYPES.has(dto.attachment_type)) {
      throw ValidationException.field('attachment_type', 'Task attachment type is invalid')
    }

    const task = await loadTaskForCompletionPackage(dto.task_id, this.dependencies.completion)
    const actorId = await assertTaskCompletionPackageAccess(
      this.execCtx,
      task,
      [],
      this.dependencies.org
    )

    const created = await this.dependencies.completion.createAttachment({
      task_id: dto.task_id,
      file_name: dto.file_name.trim(),
      file_path: dto.file_path.trim(),
      file_size: dto.file_size ?? null,
      mime_type: dto.mime_type ?? null,
      uploaded_by: actorId,
      attachment_type: dto.attachment_type,
    })

    return created as unknown as TaskAttachmentResult
  }
}
