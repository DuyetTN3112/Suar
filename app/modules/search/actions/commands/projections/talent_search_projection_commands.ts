import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import type {
  TalentSearchDocumentBuilderPort,
  TalentSearchStore,
} from '#modules/search/actions/ports/outbound/search_projection_store'
import type { SearchRuntimeStatusPort } from '#modules/search/actions/ports/outbound/search_runtime_status_port'
import type { UserSearchSyncReader } from '#modules/search/actions/ports/outbound/user_search_sync_reader'
import type { TalentSearchDocument } from '#modules/search/domain/entity-search/talent_search_document'
import { buildSearchProjectionFailureEvent } from '#modules/search/observability/search_event_factory'
import type { SearchProjectionWriteContext } from '#modules/search/public_contracts/search_public_api'

export class TalentSearchProjectionCommands {
  constructor(
    private readonly repository: TalentSearchStore,
    private readonly builder: TalentSearchDocumentBuilderPort,
    private readonly userSearchSyncReader: UserSearchSyncReader,
    private readonly runtime: SearchRuntimeStatusPort
  ) {}

  indexName(): string {
    return this.repository.indexName
  }

  async ensureIndex(): Promise<void> {
    await this.repository.ensureIndex()
  }

  async resetIndex(): Promise<void> {
    await this.repository.resetIndex()
  }

  async reindexDocument(userId: string, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted()
    if (!this.runtime.isEnabled()) {
      return
    }

    const document = await this.builder.build(userId, signal)
    signal?.throwIfAborted()
    if (!document || !document.is_searchable || document.status !== 'active') {
      await this.repository.deleteDocument(userId, signal)
      return
    }

    await this.repository.upsertDocument(document, signal)
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
    if (!document || !document.is_searchable || document.status !== 'active') {
      await this.repository.deleteDocumentFenced(userId, context)
      return
    }
    await this.repository.upsertDocumentFenced(document, context)
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
    if (!this.runtime.isEnabled()) {
      return { indexed: 0, skipped: 0 }
    }

    const userIds = await this.userSearchSyncReader.listActiveUserIds()
    const searchableDocuments: TalentSearchDocument[] = []
    let skipped = 0

    for (const userId of userIds) {
      const document = await this.builder.build(userId)
      if (!document || !document.is_searchable) {
        skipped += 1
        continue
      }

      searchableDocuments.push(document)
    }

    await this.repository.replaceAllDocuments(searchableDocuments)

    return { indexed: searchableDocuments.length, skipped }
  }
}
