import type { estypes } from '@elastic/elasticsearch'

import { buildUserDirectorySearchIndexName } from '#modules/search/domain/search_index_names'
import type {
  UserDirectorySearchDocument,
  UserDirectorySearchHit,
} from '#modules/search/domain/user_directory_search_document'
import { searchClient } from '#modules/search/infra/search_client'

interface UserDirectorySearchSource {
  user_id: string
}

interface UserDirectoryEngineSearchInput {
  q: string
  limit: number
}

export class UserDirectorySearchIndexRepository {
  readonly indexName = buildUserDirectorySearchIndexName()

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
          username: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          email: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          status: { type: 'keyword' },
          deleted_at: { type: 'date' },
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

  async upsertDocument(document: UserDirectorySearchDocument): Promise<void> {
    await this.ensureIndex()
    await searchClient.index({
      index: this.indexName,
      id: document.user_id,
      document,
      refresh: 'wait_for',
    })
  }

  async bulkUpsertDocuments(documents: UserDirectorySearchDocument[]): Promise<void> {
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
      { ignore: [404] }
    )
  }

  async search(input: UserDirectoryEngineSearchInput): Promise<UserDirectorySearchHit[]> {
    await this.ensureIndex()

    const query: estypes.QueryDslQueryContainer = {
      bool: {
        should: [
          {
            multi_match: {
              query: input.q,
              fields: ['username^5', 'email^4'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          },
          {
            multi_match: {
              query: input.q,
              fields: ['username^5', 'email^4'],
              type: 'phrase_prefix',
            },
          },
        ],
        minimum_should_match: 1,
        must_not: [{ exists: { field: 'deleted_at' } }],
      },
    }

    const response = await searchClient.search<UserDirectorySearchSource>({
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

      return [{ userId, score: hit._score ?? 0 }]
    })
  }
}
