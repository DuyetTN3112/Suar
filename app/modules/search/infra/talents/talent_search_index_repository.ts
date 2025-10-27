import type { estypes } from '@elastic/elasticsearch'

import { buildTalentSearchIndexName } from '#modules/search/domain/search_index_names'
import type { TalentSearchDocument, TalentSearchHit } from '#modules/search/domain/talent_search_document'
import { searchClient } from '#modules/search/infra/search_client'

interface TalentEngineSearchInput {
  q: string
  limit: number
}

interface TalentSearchSource {
  user_id: string
}

export class TalentSearchIndexRepository {
  readonly indexName = buildTalentSearchIndexName()

  async ensureIndex(): Promise<void> {
    const exists = await searchClient.indices.exists({ index: this.indexName })
    if (exists) {
      return
    }

    await searchClient.indices.create({
      index: this.indexName,
      mappings: {
        properties: {
          user_id: { type: 'keyword' },
          username: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
          display_name: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
          headline: { type: 'text' },
          bio: { type: 'text' },
          status: { type: 'keyword' },
          is_searchable: { type: 'boolean' },
          skill_ids: { type: 'keyword' },
          skills_text: { type: 'text' },
          business_domains: { type: 'keyword' },
          problem_categories: { type: 'keyword' },
          task_types: { type: 'keyword' },
          trust_score: { type: 'float' },
          completed_tasks: { type: 'integer' },
          reviewed_skills_count: { type: 'integer' },
          imported_skills_count: { type: 'integer' },
          under_dispute_skills_count: { type: 'integer' },
          latest_confidence_signal: { type: 'keyword' },
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

  async upsertDocument(document: TalentSearchDocument): Promise<void> {
    await this.ensureIndex()
    await searchClient.index({
      index: this.indexName,
      id: document.user_id,
      document,
      refresh: 'wait_for',
    })
  }

  async bulkUpsertDocuments(documents: TalentSearchDocument[]): Promise<void> {
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
            _id: document.user_id,
          },
        },
        document,
      ]),
    })
  }

  async deleteDocument(userId: string): Promise<void> {
    const exists = await searchClient.indices.exists({ index: this.indexName })
    if (!exists) {
      return
    }

    await searchClient.delete(
      {
        index: this.indexName,
        id: userId,
        refresh: 'wait_for',
      },
      {
        ignore: [404],
      }
    )
  }

  async search(input: TalentEngineSearchInput): Promise<TalentSearchHit[]> {
    await this.ensureIndex()

    const query: estypes.QueryDslQueryContainer = {
      bool: {
        should: [
          {
            multi_match: {
              query: input.q,
              fields: ['username^5', 'display_name^4', 'headline^4', 'skills_text^3', 'bio'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          },
          {
            multi_match: {
              query: input.q,
              fields: ['username^5', 'display_name^4', 'headline^4', 'skills_text^3', 'bio'],
              type: 'phrase_prefix',
            },
          },
        ],
        minimum_should_match: 1,
        filter: [
          { term: { is_searchable: true } },
          { term: { status: 'active' } },
        ],
      },
    }

    const response = await searchClient.search<TalentSearchSource>({
      index: this.indexName,
      size: input.limit,
      query,
      _source: ['user_id'],
    })

    return response.hits.hits.flatMap((hit) => {
      const userId = hit._source?.user_id
      if (!userId) {
        return []
      }

      return [
        {
          userId,
          score: hit._score ?? 0,
        },
      ]
    })
  }
}
