import type { NotificationSearchDocument } from '#modules/notifications/domain/notification-feed/notification_projection_document'

export interface NotificationProjectionFailure {
  notificationId: string
  retryable: boolean
  status: number
  errorClass: string
  errorMessage: string
}

export interface NotificationProjectionBatchResult {
  appliedIds: string[]
  staleIds: string[]
  failures: NotificationProjectionFailure[]
}

export interface NotificationPhysicalPurgeResult {
  appliedIds: string[]
  failures: NotificationProjectionFailure[]
}

export interface NotificationProjectionRevision {
  notificationId: string
  revision: number
  deleted: boolean
}

export interface NotificationProjectionWriter {
  projectMany(
    physicalIndex: string,
    documents: NotificationSearchDocument[]
  ): Promise<NotificationProjectionBatchResult>
  purgeMany(
    physicalIndex: string,
    notificationIds: string[]
  ): Promise<NotificationPhysicalPurgeResult>
}

export interface NotificationProjectionIndexAdministration {
  ensurePhysicalIndex(index: string): Promise<void>
  refresh(index: string): Promise<void>
  deletePhysicalIndex(index: string): Promise<void>
  aliasIndices(alias: string): Promise<string[]>
  swapAliases(input: {
    sourceIndex: string
    targetIndex: string
    readAlias: string
    writeAlias: string
  }): Promise<void>
  scanRevisions(index: string, batchSize: number): AsyncGenerator<NotificationProjectionRevision>
}

export interface NotificationProjectionAliases {
  readAlias: string
  writeAlias: string
}
