import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import loggerService from '#modules/logger/public_contracts/application_logger'
import type { ProjectSearchSyncReader } from '#modules/search/actions/ports/outbound/project_search_sync_reader'
import type {
  ProjectSearchDocumentBuilderPort,
  ProjectSearchStore,
} from '#modules/search/actions/ports/outbound/search_projection_store'
import type { SearchRuntimeStatusPort } from '#modules/search/actions/ports/outbound/search_runtime_status_port'
import type { ProjectSearchDocument } from '#modules/search/domain/project_search_document'
import type { SearchProjectionWriteContext } from '#modules/search/public_contracts/search_public_api'

export class ProjectSearchProjectionCommands {
  constructor(
    private readonly repository: ProjectSearchStore,
    private readonly builder: ProjectSearchDocumentBuilderPort,
    private readonly projectSearchSyncReader: ProjectSearchSyncReader,
    private readonly runtime: SearchRuntimeStatusPort
  ) {}

  indexName(): string {
    return this.repository.indexName
  }

  async reindexDocument(
    projectId: string,
    context: SearchProjectionWriteContext = {}
  ): Promise<void> {
    context.signal?.throwIfAborted()
    if (!this.runtime.isEnabled()) {
      return
    }

    const document = await this.builder.build(projectId)
    context.signal?.throwIfAborted()
    if (!document) {
      await this.repository.deleteDocument(projectId, context)
      return
    }
    if (document.deleted_at) {
      await this.repository.deleteDocument(projectId, context)
      return
    }

    await this.repository.upsertDocument(document, context)
  }

  async reindexDocumentQuietly(projectId: string): Promise<void> {
    try {
      await this.reindexDocument(projectId)
    } catch (error) {
      loggerService.warn('[ProjectSearchProjectionCommands] Failed to reindex project document', {
        projectId,
        error: serializeObservabilityError(error),
      })
    }
  }

  async removeDocument(
    projectId: string,
    context: SearchProjectionWriteContext = {}
  ): Promise<void> {
    context.signal?.throwIfAborted()
    await this.repository.deleteDocument(projectId, context)
  }

  async removeDocumentQuietly(projectId: string): Promise<void> {
    try {
      await this.removeDocument(projectId)
    } catch (error) {
      loggerService.warn('[ProjectSearchProjectionCommands] Failed to delete project document', {
        projectId,
        error: serializeObservabilityError(error),
      })
    }
  }

  async reindexAll(): Promise<{ indexed: number; skipped: number }> {
    if (!this.runtime.isEnabled()) {
      return { indexed: 0, skipped: 0 }
    }

    const projectIds = await this.projectSearchSyncReader.listNotDeletedProjectIds()
    const documents: ProjectSearchDocument[] = []
    let skipped = 0

    for (const projectId of projectIds) {
      const document = await this.builder.build(projectId)
      if (!document || document.deleted_at) {
        skipped += 1
        continue
      }

      documents.push(document)
    }

    await this.repository.replaceAllDocuments(documents)

    return { indexed: documents.length, skipped }
  }
}
