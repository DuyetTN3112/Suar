import type { estypes } from '@elastic/elasticsearch'

import type { SearchIndexCutoverFencePort } from '#modules/search/actions/ports/outbound/search_index_cutover_fence_port'
import type {
  SkillSearchDocument,
  SkillSearchHit,
} from '#modules/search/domain/skill_search_document'
import { bulkIndexSearchDocuments } from '#modules/search/infra/search_bulk_indexer'
import {
  buildSkillSearchIndexName,
  buildSkillSearchPhysicalIndexName,
} from '#modules/search/infra/search_index_names'
import { VersionedSearchIndexLifecycle } from '#modules/search/infra/versioned_search_index_lifecycle'
import { searchClient } from '#platform/search/elasticsearch_client'

interface SkillSearchSource {
  skill_id: string
}

interface SkillEngineSearchInput {
  q: string
  limit: number
}

export class SkillSearchIndexRepository {
  readonly indexName = buildSkillSearchIndexName()
  readonly physicalIndexName = buildSkillSearchPhysicalIndexName()
  private readonly lifecycle: VersionedSearchIndexLifecycle

  constructor(cutoverFence?: SearchIndexCutoverFencePort) {
    this.lifecycle = new VersionedSearchIndexLifecycle(
      searchClient,
      this.indexName,
      this.physicalIndexName,
      cutoverFence
    )
  }

  async ensureIndex(): Promise<void> {
    await this.lifecycle.ensureIndex({
      mappings: {
        properties: {
          skill_id: { type: 'keyword' },
          skill_code: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          skill_name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          category_code: { type: 'keyword' },
          display_type: { type: 'keyword' },
          description: { type: 'text' },
          is_active: { type: 'boolean' },
          updated_at: { type: 'date' },
        },
      },
    })
  }

  async resetIndex(): Promise<void> {
    await this.lifecycle.resetIndex()
  }

  async upsertDocument(document: SkillSearchDocument): Promise<void> {
    await this.ensureIndex()
    await searchClient.index({
      index: this.indexName,
      id: document.skill_id,
      document,
      refresh: 'wait_for',
    })
  }

  async bulkUpsertDocuments(documents: SkillSearchDocument[]): Promise<void> {
    if (documents.length === 0) {
      return
    }

    await this.ensureIndex()
    await bulkIndexSearchDocuments(searchClient, {
      indexName: this.indexName,
      documents,
      documentId: (document) => document.skill_id,
      refresh: true,
    })
  }

  async replaceAllDocuments(documents: SkillSearchDocument[]): Promise<void> {
    await this.ensureIndex()
    await this.lifecycle.rebuildIndex(async (physicalIndexName) => {
      await bulkIndexSearchDocuments(searchClient, {
        indexName: physicalIndexName,
        documents,
        documentId: (document) => document.skill_id,
      })
      return documents.length
    })
  }

  async deleteDocument(skillId: string): Promise<void> {
    const exists = await searchClient.indices.exists({ index: this.indexName })
    if (!exists) {
      return
    }

    await searchClient.delete(
      {
        index: this.indexName,
        id: skillId,
        refresh: 'wait_for',
      },
      { ignore: [404] }
    )
  }

  async search(input: SkillEngineSearchInput): Promise<SkillSearchHit[]> {
    const query: estypes.QueryDslQueryContainer = {
      bool: {
        must: [{ term: { is_active: true } }],
        should: [
          {
            multi_match: {
              query: input.q,
              fields: ['skill_name^5', 'skill_code^4', 'description^2'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          },
          {
            multi_match: {
              query: input.q,
              fields: ['skill_name^5', 'skill_code^4', 'description^2'],
              type: 'phrase_prefix',
            },
          },
        ],
        minimum_should_match: 1,
      },
    }

    const response = await searchClient.search<SkillSearchSource>({
      index: this.indexName,
      size: input.limit,
      query,
      _source: ['skill_id'],
    })

    return response.hits.hits.flatMap((hit) => {
      const skillId = hit._source?.skill_id
      if (!skillId) {
        return []
      }

      return [{ skillId, score: hit._score ?? 0 }]
    })
  }
}
