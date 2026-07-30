import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import type { TaskAttachmentStorage } from '#modules/tasks/actions/ports/outbound/task_attachment_storage'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/task_completion_package_access'

export interface UploadTaskAttachmentDTO {
  task_id: string
  temporary_path: string
  original_name: string
  file_size: number
  mime_type: string | null
  attachment_type: 'requirement' | 'reference' | 'submission' | 'review' | 'other'
}

const VALID_ATTACHMENT_TYPES = new Set<UploadTaskAttachmentDTO['attachment_type']>([
  'requirement',
  'reference',
  'submission',
  'review',
  'other',
])

export default class UploadTaskAttachmentCommand extends BaseCommand<
  UploadTaskAttachmentDTO,
  Record<string, unknown>
> {
  constructor(
    private readonly context: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies,
    private readonly storage: TaskAttachmentStorage
  ) {
    super(context, dependencies.transactions)
  }

  async handle(dto: UploadTaskAttachmentDTO): Promise<Record<string, unknown>> {
    return this.execute(dto)
  }

  async execute(dto: UploadTaskAttachmentDTO): Promise<Record<string, unknown>> {
    if (!dto.temporary_path.trim() || !dto.original_name.trim()) {
      throw new BusinessLogicException('Task attachment upload is invalid')
    }
    if (dto.file_size < 0) {
      throw new BusinessLogicException('Task attachment file size cannot be negative')
    }
    if (!VALID_ATTACHMENT_TYPES.has(dto.attachment_type)) {
      throw new BusinessLogicException('Task attachment type is invalid')
    }

    const task = await loadTaskForCompletionPackage(dto.task_id, this.dependencies.completion)
    const actorId = await assertTaskCompletionPackageAccess(
      this.context,
      task,
      [],
      this.dependencies.org
    )
    const stored = await this.storage.store({
      taskId: dto.task_id,
      temporaryPath: dto.temporary_path,
      originalName: dto.original_name,
      fileSize: dto.file_size,
      mimeType: dto.mime_type,
    })

    return this.dependencies.completion.createAttachment({
      task_id: dto.task_id,
      file_name: stored.fileName,
      file_path: stored.filePath,
      file_size: stored.fileSize,
      mime_type: stored.mimeType,
      uploaded_by: actorId,
      attachment_type: dto.attachment_type,
    })
  }
}
