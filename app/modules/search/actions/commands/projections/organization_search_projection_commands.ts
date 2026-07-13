import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import loggerService from '#modules/logger/public_contracts/application_logger'
import type { OrganizationSearchSyncReader } from '#modules/search/actions/ports/outbound/organization_search_sync_reader'
import type {
  OrganizationSearchDocumentBuilderPort,
  OrganizationSearchStore,
} from '#modules/search/actions/ports/outbound/search_projection_store'
import type { SearchRuntimeStatusPort } from '#modules/search/actions/ports/outbound/search_runtime_status_port'
import type { OrganizationSearchDocument } from '#modules/search/domain/entity-search/organization_search_document'

export class OrganizationSearchProjectionCommands {
  constructor(
    private readonly repository: OrganizationSearchStore,
    private readonly builder: OrganizationSearchDocumentBuilderPort,
    private readonly organizationSearchSyncReader: OrganizationSearchSyncReader,
    private readonly runtime: SearchRuntimeStatusPort
  ) {}

  indexName(): string {
    return this.repository.indexName
  }

  async reindexDocument(organizationId: string): Promise<void> {
    if (!this.runtime.isEnabled()) {
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
        '[OrganizationSearchProjectionCommands] Failed to reindex organization document',
        {
          organizationId,
          error: serializeObservabilityError(error),
        }
      )
    }
  }

  async removeDocumentQuietly(organizationId: string): Promise<void> {
    try {
      await this.repository.deleteDocument(organizationId)
    } catch (error) {
      loggerService.warn(
        '[OrganizationSearchProjectionCommands] Failed to delete organization document',
        {
          organizationId,
          error: serializeObservabilityError(error),
        }
      )
    }
  }

  async reindexAll(): Promise<{ indexed: number; skipped: number }> {
    if (!this.runtime.isEnabled()) {
      return { indexed: 0, skipped: 0 }
    }

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

    await this.repository.replaceAllDocuments(documents)

    return { indexed: documents.length, skipped }
  }
}
