import type { estypes } from '@elastic/elasticsearch'

import { buildSkillSearchIndexName } from '#modules/search/domain/search_index_names'
import type { SkillSearchDocument, SkillSearchHit } from '#modules/search/domain/skill_search_document'
import { searchClient } from '#modules/search/infra/search_client'

interface SkillSearchSource {
  skill_id: string
}

interface SkillEngineSearchInput {
  q: string
  limit: number
}

export class SkillSearchIndexRepository {
  readonly indexName = buildSkillSearchIndexName()

  async ensureIndex(): Promise<void> {
    const exists = await searchClient.indices.exists({ index: this.indexName })
    if (exists) {
      return
    }

    await searchClient.indices.create({
      index: this.indexName,
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
    const exists = await searchClient.indices.exists({ index: this.indexName })
    if (!exists) {
      return
    }

    await searchClient.indices.delete({ index: this.indexName })
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
    await searchClient.bulk({
      refresh: true,
      operations: documents.flatMap((document) => [
        {
          index: {
            _index: this.indexName,
            _id: document.skill_id,
          },
        },
        document,
      ]),
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
    await this.ensureIndex()

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
