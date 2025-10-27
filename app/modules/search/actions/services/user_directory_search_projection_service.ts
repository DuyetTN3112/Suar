import loggerService from '#modules/logger/public_contracts/logger_service'
import { buildUserDirectorySearchIndexName } from '#modules/search/domain/search_index_names'
import type { UserDirectorySearchDocument } from '#modules/search/domain/user_directory_search_document'
import { UserDirectorySearchDocumentBuilder } from '#modules/search/infra/users/user_directory_search_document_builder'
import { UserDirectorySearchIndexRepository } from '#modules/search/infra/users/user_directory_search_index_repository'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'
import type { UserSearchSyncReader } from '#modules/users/application/ports/user_search_sync_reader'
import { userSearchSyncReader as defaultUserSearchSyncReader } from '#modules/users/public_contracts/user_search_indexing'

export class UserDirectorySearchProjectionService {
  constructor(
    private readonly repository: UserDirectorySearchIndexRepository = new UserDirectorySearchIndexRepository(),
    private readonly builder: UserDirectorySearchDocumentBuilder = new UserDirectorySearchDocumentBuilder(),
    private readonly userSearchSyncReader: UserSearchSyncReader = defaultUserSearchSyncReader
  ) {}

  indexName(): string {
    return buildUserDirectorySearchIndexName()
  }

  async reindexDocument(userId: string): Promise<void> {
    if (!isSearchRuntimeEnabled()) {
      return
    }

    const document = await this.builder.build(userId)
    if (document.deleted_at) {
      await this.repository.deleteDocument(userId)
      return
    }

    await this.repository.upsertDocument(document)
  }

  async reindexDocumentQuietly(userId: string): Promise<void> {
    try {
      await this.reindexDocument(userId)
    } catch (error) {
      loggerService.warn(
        '[UserDirectorySearchProjectionService] Failed to reindex user directory document',
        {
          userId,
          error: error instanceof Error ? error.message : String(error),
        }
      )
    }
  }

  async removeDocumentQuietly(userId: string): Promise<void> {
    try {
      await this.repository.deleteDocument(userId)
    } catch (error) {
      loggerService.warn(
        '[UserDirectorySearchProjectionService] Failed to delete user directory document',
        {
          userId,
          error: error instanceof Error ? error.message : String(error),
        }
      )
    }
  }

  async reindexAll(): Promise<{ indexed: number; skipped: number }> {
    if (!isSearchRuntimeEnabled()) {
      return { indexed: 0, skipped: 0 }
    }

    await this.repository.resetIndex()
    await this.repository.ensureIndex()

    const userIds = await this.userSearchSyncReader.listNotDeletedUserIds()
    const documents: UserDirectorySearchDocument[] = []
    let skipped = 0

    for (const userId of userIds) {
      const document = await this.builder.build(userId)
      if (document.deleted_at) {
        skipped += 1
        continue
      }

      documents.push(document)
    }

    await this.repository.bulkUpsertDocuments(documents)

    return { indexed: documents.length, skipped }
  }
}
