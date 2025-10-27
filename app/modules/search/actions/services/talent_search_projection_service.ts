import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import { buildTalentSearchIndexName } from '#modules/search/domain/search_index_names'
import type { TalentSearchDocument } from '#modules/search/domain/talent_search_document'
import { TalentSearchDocumentBuilder } from '#modules/search/infra/talents/talent_search_document_builder'
import { TalentSearchIndexRepository } from '#modules/search/infra/talents/talent_search_index_repository'
import { buildSearchProjectionFailureEvent } from '#modules/search/observability/search_event_factory'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'
import type { UserSearchSyncReader } from '#modules/users/application/ports/user_search_sync_reader'
import { userSearchSyncReader as defaultUserSearchSyncReader } from '#modules/users/public_contracts/user_search_indexing'

export class TalentSearchProjectionService {
  constructor(
    private readonly repository: TalentSearchIndexRepository = new TalentSearchIndexRepository(),
    private readonly builder: TalentSearchDocumentBuilder = new TalentSearchDocumentBuilder(),
    private readonly userSearchSyncReader: UserSearchSyncReader = defaultUserSearchSyncReader
  ) {}

  indexName(): string {
    return buildTalentSearchIndexName()
  }

  async ensureIndex(): Promise<void> {
    await this.repository.ensureIndex()
  }

  async resetIndex(): Promise<void> {
    await this.repository.resetIndex()
  }

  async reindexDocument(userId: string): Promise<void> {
    if (!isSearchRuntimeEnabled()) {
      return
    }

    const document = await this.builder.build(userId)
    if (!document.is_searchable || document.status !== 'active') {
      await this.repository.deleteDocument(userId)
      return
    }

    await this.repository.upsertDocument(document)
  }

  async reindexDocumentQuietly(userId: string): Promise<void> {
    try {
      await this.reindexDocument(userId)
    } catch (error) {
      platformOperationalLogger.log(
        'warn',
        buildSearchProjectionFailureEvent(
          {
            userId: null,
            ip: '0.0.0.0',
            userAgent: 'system',
            organizationId: null,
            workflowId: 'talent_projection_reindex',
          },
          {
            entityType: 'talent',
            entityId: userId,
            workflow: 'talent_projection_reindex',
            eventName: 'search.projection.failed',
            error,
          }
        )
      )
    }
  }

  async reindexAll(): Promise<{ indexed: number; skipped: number }> {
    if (!isSearchRuntimeEnabled()) {
      return { indexed: 0, skipped: 0 }
    }

    await this.repository.resetIndex()
    await this.repository.ensureIndex()

    const userIds = await this.userSearchSyncReader.listActiveUserIds()
    const searchableDocuments: TalentSearchDocument[] = []
    let skipped = 0

    for (const userId of userIds) {
      const document = await this.builder.build(userId)
      if (!document.is_searchable) {
        skipped += 1
        continue
      }

      searchableDocuments.push(document)
    }

    await this.repository.bulkUpsertDocuments(searchableDocuments)

    return { indexed: searchableDocuments.length, skipped }
  }
}
