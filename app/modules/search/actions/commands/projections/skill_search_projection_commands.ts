import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import loggerService from '#modules/logger/public_contracts/application_logger'
import type {
  SkillSearchDocumentBuilderPort,
  SkillSearchStore,
} from '#modules/search/actions/ports/outbound/search_projection_store'
import type { SearchRuntimeStatusPort } from '#modules/search/actions/ports/outbound/search_runtime_status_port'
import type { SkillSearchSyncReader } from '#modules/search/actions/ports/outbound/skill_search_sync_reader'
import type { SkillSearchDocument } from '#modules/search/domain/skill_search_document'

export class SkillSearchProjectionCommands {
  constructor(
    private readonly repository: SkillSearchStore,
    private readonly builder: SkillSearchDocumentBuilderPort,
    private readonly skillSearchSyncReader: SkillSearchSyncReader,
    private readonly runtime: SearchRuntimeStatusPort
  ) {}

  indexName(): string {
    return this.repository.indexName
  }

  async reindexDocument(skillId: string): Promise<void> {
    if (!this.runtime.isEnabled()) {
      return
    }

    const document = await this.builder.build(skillId)
    if (!document.is_active) {
      await this.repository.deleteDocument(skillId)
      return
    }

    await this.repository.upsertDocument(document)
  }

  async reindexDocumentQuietly(skillId: string): Promise<void> {
    try {
      await this.reindexDocument(skillId)
    } catch (error) {
      loggerService.warn('[SkillSearchProjectionCommands] Failed to reindex skill document', {
        skillId,
        error: serializeObservabilityError(error),
      })
    }
  }

  async reindexAll(): Promise<{ indexed: number; skipped: number }> {
    if (!this.runtime.isEnabled()) {
      return { indexed: 0, skipped: 0 }
    }

    const skillIds = await this.skillSearchSyncReader.listActiveSkillIds()
    const documents: SkillSearchDocument[] = []
    let skipped = 0

    for (const skillId of skillIds) {
      const document = await this.builder.build(skillId)
      if (!document.is_active) {
        skipped += 1
        continue
      }

      documents.push(document)
    }

    await this.repository.replaceAllDocuments(documents)

    return { indexed: documents.length, skipped }
  }
}
