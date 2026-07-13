import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import loggerService from '#modules/logger/public_contracts/application_logger'
import type {
  UserDirectorySearchDocumentBuilderPort,
  UserDirectorySearchStore,
} from '#modules/search/actions/ports/outbound/search_projection_store'
import type { SearchRuntimeStatusPort } from '#modules/search/actions/ports/outbound/search_runtime_status_port'
import type { UserSearchSyncReader } from '#modules/search/actions/ports/outbound/user_search_sync_reader'
import type { UserDirectorySearchDocument } from '#modules/search/domain/entity-search/user_directory_search_document'
import type { SearchProjectionWriteContext } from '#modules/search/public_contracts/search_public_api'

export class UserDirectorySearchProjectionCommands {
  constructor(
    private readonly repository: UserDirectorySearchStore,
    private readonly builder: UserDirectorySearchDocumentBuilderPort,
    private readonly userSearchSyncReader: UserSearchSyncReader,
    private readonly runtime: SearchRuntimeStatusPort
  ) {}

  indexName(): string {
    return this.repository.indexName
  }

  async reindexDocument(userId: string): Promise<void> {
    if (!this.runtime.isEnabled()) {
      return
    }

    const document = await this.builder.build(userId)
    if (!document || document.deleted_at || document.status !== 'active') {
      await this.repository.deleteDocument(userId)
      return
    }

    await this.repository.upsertDocument(document)
  }

  async reindexDocumentFenced(
    userId: string,
    context: SearchProjectionWriteContext
  ): Promise<void> {
    context.signal?.throwIfAborted()
    if (!this.runtime.isEnabled()) {
      return
    }
    const document = await this.builder.build(userId, context.signal)
    context.signal?.throwIfAborted()
    if (!document || document.deleted_at || document.status !== 'active') {
      await this.repository.deleteDocumentFenced(userId, context)
      return
    }
    await this.repository.upsertDocumentFenced(document, context)
  }

  async reindexDocumentQuietly(userId: string): Promise<void> {
    try {
      await this.reindexDocument(userId)
    } catch (error) {
      loggerService.warn(
        '[UserDirectorySearchProjectionCommands] Failed to reindex user directory document',
        {
          userId,
          error: serializeObservabilityError(error),
        }
      )
    }
  }

  async removeDocumentQuietly(userId: string): Promise<void> {
    try {
      await this.repository.deleteDocument(userId)
    } catch (error) {
      loggerService.warn(
        '[UserDirectorySearchProjectionCommands] Failed to delete user directory document',
        {
          userId,
          error: serializeObservabilityError(error),
        }
      )
    }
  }

  async reindexAll(): Promise<{ indexed: number; skipped: number }> {
    if (!this.runtime.isEnabled()) {
      return { indexed: 0, skipped: 0 }
    }

    const userIds = await this.userSearchSyncReader.listNotDeletedUserIds()
    const documents: UserDirectorySearchDocument[] = []
    let skipped = 0

    for (const userId of userIds) {
      const document = await this.builder.build(userId)
      if (!document || document.deleted_at || document.status !== 'active') {
        skipped += 1
        continue
      }

      documents.push(document)
    }

    await this.repository.replaceAllDocuments(documents)

    return { indexed: documents.length, skipped }
  }
}
