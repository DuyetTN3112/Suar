import loggerService from '#modules/logger/public_contracts/logger_service'
import type { ProjectSearchSyncReader } from '#modules/projects/application/ports/project_search_sync_reader'
import { projectSearchSyncReader as defaultProjectSearchSyncReader } from '#modules/projects/public_contracts/project_search_indexing'
import type { ProjectSearchDocument } from '#modules/search/domain/project_search_document'
import { buildProjectSearchIndexName } from '#modules/search/domain/search_index_names'
import { ProjectSearchDocumentBuilder } from '#modules/search/infra/projects/project_search_document_builder'
import { ProjectSearchIndexRepository } from '#modules/search/infra/projects/project_search_index_repository'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'

export class ProjectSearchProjectionService {
  constructor(
    private readonly repository: ProjectSearchIndexRepository = new ProjectSearchIndexRepository(),
    private readonly builder: ProjectSearchDocumentBuilder = new ProjectSearchDocumentBuilder(),
    private readonly projectSearchSyncReader: ProjectSearchSyncReader = defaultProjectSearchSyncReader
  ) {}

  indexName(): string {
    return buildProjectSearchIndexName()
  }

  async reindexDocument(projectId: string): Promise<void> {
    if (!isSearchRuntimeEnabled()) {
      return
    }

    const document = await this.builder.build(projectId)
    if (document.deleted_at) {
      await this.repository.deleteDocument(projectId)
      return
    }

    await this.repository.upsertDocument(document)
  }

  async reindexDocumentQuietly(projectId: string): Promise<void> {
    try {
      await this.reindexDocument(projectId)
    } catch (error) {
      loggerService.warn('[ProjectSearchProjectionService] Failed to reindex project document', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async removeDocumentQuietly(projectId: string): Promise<void> {
    try {
      await this.repository.deleteDocument(projectId)
    } catch (error) {
      loggerService.warn('[ProjectSearchProjectionService] Failed to delete project document', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async reindexAll(): Promise<{ indexed: number; skipped: number }> {
    if (!isSearchRuntimeEnabled()) {
      return { indexed: 0, skipped: 0 }
    }

    await this.repository.resetIndex()
    await this.repository.ensureIndex()

    const projectIds = await this.projectSearchSyncReader.listNotDeletedProjectIds()
    const documents: ProjectSearchDocument[] = []
    let skipped = 0

    for (const projectId of projectIds) {
      const document = await this.builder.build(projectId)
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
