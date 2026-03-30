import loggerService from '#modules/logger/public_contracts/logger_service'
import { buildSkillSearchIndexName } from '#modules/search/domain/search_index_names'
import type { SkillSearchDocument } from '#modules/search/domain/skill_search_document'
import { SkillSearchDocumentBuilder } from '#modules/search/infra/skills/skill_search_document_builder'
import { SkillSearchIndexRepository } from '#modules/search/infra/skills/skill_search_index_repository'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'
import type { SkillSearchSyncReader } from '#modules/skills/application/ports/skill_search_sync_reader'
import { skillSearchSyncReader as defaultSkillSearchSyncReader } from '#modules/skills/public_contracts/skill_search_indexing'

export class SkillSearchProjectionService {
  constructor(
    private readonly repository: SkillSearchIndexRepository = new SkillSearchIndexRepository(),
    private readonly builder: SkillSearchDocumentBuilder = new SkillSearchDocumentBuilder(),
    private readonly skillSearchSyncReader: SkillSearchSyncReader = defaultSkillSearchSyncReader
  ) {}

  indexName(): string {
    return buildSkillSearchIndexName()
  }

  async reindexDocument(skillId: string): Promise<void> {
    if (!isSearchRuntimeEnabled()) {
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
      loggerService.warn('[SkillSearchProjectionService] Failed to reindex skill document', {
        skillId,
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

    await this.repository.bulkUpsertDocuments(documents)

    return { indexed: documents.length, skipped }
  }
}
