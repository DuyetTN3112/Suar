import loggerService from '#modules/logger/public_contracts/logger_service'
import type { OrganizationSearchSyncReader } from '#modules/organizations/application/ports/organization_search_sync_reader'
import { organizationSearchSyncReader as defaultOrganizationSearchSyncReader } from '#modules/organizations/public_contracts/organization_search_indexing'
import type { OrganizationSearchDocument } from '#modules/search/domain/organization_search_document'
import { buildOrganizationSearchIndexName } from '#modules/search/domain/search_index_names'
import { OrganizationSearchDocumentBuilder } from '#modules/search/infra/organizations/organization_search_document_builder'
import { OrganizationSearchIndexRepository } from '#modules/search/infra/organizations/organization_search_index_repository'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'

export class OrganizationSearchProjectionService {
  constructor(
    private readonly repository: OrganizationSearchIndexRepository = new OrganizationSearchIndexRepository(),
    private readonly builder: OrganizationSearchDocumentBuilder = new OrganizationSearchDocumentBuilder(),
    private readonly organizationSearchSyncReader: OrganizationSearchSyncReader = defaultOrganizationSearchSyncReader
  ) {}

  indexName(): string {
    return buildOrganizationSearchIndexName()
  }

  async reindexDocument(organizationId: string): Promise<void> {
    if (!isSearchRuntimeEnabled()) {
      return
    }

    const document = await this.builder.build(organizationId)
    if (document.deleted_at) {
      await this.repository.deleteDocument(organizationId)
      return
    }

    await this.repository.upsertDocument(document)
  }

  async reindexDocumentQuietly(organizationId: string): Promise<void> {
    try {
      await this.reindexDocument(organizationId)
    } catch (error) {
      loggerService.warn(
        '[OrganizationSearchProjectionService] Failed to reindex organization document',
        {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        }
      )
    }
  }

  async removeDocumentQuietly(organizationId: string): Promise<void> {
    try {
      await this.repository.deleteDocument(organizationId)
    } catch (error) {
      loggerService.warn(
        '[OrganizationSearchProjectionService] Failed to delete organization document',
        {
          organizationId,
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

    const organizationIds = await this.organizationSearchSyncReader.listNotDeletedOrganizationIds()
    const documents: OrganizationSearchDocument[] = []
    let skipped = 0

    for (const organizationId of organizationIds) {
      const document = await this.builder.build(organizationId)
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
