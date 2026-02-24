import { randomUUID } from 'node:crypto'

import drive from '@adonisjs/drive/services/main'

import {
  TaskAttachmentStorage,
  type StoreTaskAttachmentInput,
  type StoredTaskAttachment,
} from '#modules/tasks/actions/ports/outbound/task_attachment_storage'

function sanitizeFileName(fileName: string): string {
  return (
    fileName
      .trim()
      .replace(/[/\\]/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 140) || 'attachment'
  )
}

export class DriveTaskAttachmentStorage extends TaskAttachmentStorage {
  override async store(input: StoreTaskAttachmentInput): Promise<StoredTaskAttachment> {
    const fileName = sanitizeFileName(input.originalName)
    const storageKey = `tasks/${input.taskId}/attachments/${randomUUID()}-${fileName}`
    const disk = drive.use('public')

    await disk.moveFromFs(input.temporaryPath, storageKey, {
      ...(input.mimeType ? { contentType: input.mimeType } : {}),
      contentLength: input.fileSize,
      visibility: 'public',
    })

    return {
      fileName,
      filePath: await disk.getUrl(storageKey),
      fileSize: input.fileSize,
      mimeType: input.mimeType,
    }
  }
}
