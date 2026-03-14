export interface StoreTaskAttachmentInput {
  taskId: string
  temporaryPath: string
  originalName: string
  fileSize: number
  mimeType: string | null
}

export interface StoredTaskAttachment {
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string | null
}

export abstract class TaskAttachmentStorage {
  abstract store(input: StoreTaskAttachmentInput): Promise<StoredTaskAttachment>
}
