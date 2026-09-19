import { searchPublicApi } from '#composition/search/public-api/search_public_api_composition'
import { searchConfig } from '#config/search'
import {
  buildTaskSearchIndexName,
  buildSearchGenerationIndexName,
} from '#modules/search/infra/adapters/index-administration/search_index_names'
import {
  SearchAliasIntegrityFaultController,
  type SearchAliasIntegrityIndices,
} from '#modules/search/infra/adapters/search-discovery/search_alias_integrity_fault_controller'
import {
  advanceSearchDiscoveryClock,
  restoreSearchDiscoveryClock,
} from '#modules/search/infra/adapters/search-discovery/search_discovery_clock'
import { TASK_SEARCH_INDEX_MAPPINGS } from '#modules/search/infra/repositories/entity-search/tasks/task_search_index_repository'
import { searchClient } from '#platform/search/elasticsearch_client'

export class TestingSearchRoleplayService {
  private faultController = new SearchAliasIntegrityFaultController(
    searchClient.indices as unknown as SearchAliasIntegrityIndices
  )
  private aliasFaultOwner: string | null = null
  private cursorClockOwner: string | null = null

  private talentSearchIndexPrepared = false
  private talentSearchIndexPreparationPromise: Promise<void> | null = null

  async prepareTalentSearchIndexForE2e(): Promise<void> {
    if (this.talentSearchIndexPrepared) {
      return
    }

    if (this.talentSearchIndexPreparationPromise) {
      await this.talentSearchIndexPreparationPromise
      return
    }

    this.talentSearchIndexPreparationPromise = (async () => {
      await searchPublicApi.resetTalentIndex()
      this.talentSearchIndexPrepared = true
    })()

    try {
      await this.talentSearchIndexPreparationPromise
    } finally {
      this.talentSearchIndexPreparationPromise = null
    }
  }

  async cleanupSearchRoleplayState(tokens: readonly string[]): Promise<void> {
    const ownsCleanupToken = (owner: string | null): boolean => {
      if (owner === null) return false
      const separator = owner.indexOf(':')
      return separator > 0 && tokens.includes(owner.slice(0, separator))
    }

    if (ownsCleanupToken(this.aliasFaultOwner)) {
      await this.faultController.restore({
        aliasName: buildTaskSearchIndexName(),
        faultIndexName: buildSearchGenerationIndexName(buildTaskSearchIndexName(), 'rp-fst-09-fault'),
      })
      this.aliasFaultOwner = null
    }

    if (ownsCleanupToken(this.cursorClockOwner)) {
      restoreSearchDiscoveryClock()
      this.cursorClockOwner = null
    }
  }

  getAliasFaultOwner(): string | null {
    return this.aliasFaultOwner
  }

  getCursorClockOwner(): string | null {
    return this.cursorClockOwner
  }

  async enableAliasFault(ownerToken: string): Promise<Record<string, unknown>> {
    const aliasName = buildTaskSearchIndexName()
    const faultIndexName = buildSearchGenerationIndexName(aliasName, 'rp-fst-09-fault')
    const result = await this.faultController.enable({
      aliasName,
      faultIndexName,
      mappings: TASK_SEARCH_INDEX_MAPPINGS as unknown as Record<string, unknown>,
    })
    this.aliasFaultOwner = ownerToken
    return result as unknown as Record<string, unknown>
  }

  async restoreAliasFault(): Promise<Record<string, unknown>> {
    const aliasName = buildTaskSearchIndexName()
    const faultIndexName = buildSearchGenerationIndexName(aliasName, 'rp-fst-09-fault')
    const result = await this.faultController.restore({ aliasName, faultIndexName })
    this.aliasFaultOwner = null
    return result as unknown as Record<string, unknown>
  }

  advanceCursorClock(ownerToken: string): void {
    advanceSearchDiscoveryClock(searchConfig.discoveryCursorTtlMs + 1)
    this.cursorClockOwner = ownerToken
  }

  restoreCursorClock(): void {
    restoreSearchDiscoveryClock()
    this.cursorClockOwner = null
  }
}

export const testingSearchRoleplayService = new TestingSearchRoleplayService()
