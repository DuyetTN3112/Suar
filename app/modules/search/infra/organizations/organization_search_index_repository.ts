import type { estypes } from '@elastic/elasticsearch'

import type {
  OrganizationSearchDocument,
  OrganizationSearchHit,
} from '#modules/search/domain/organization_search_document'
import { buildOrganizationSearchIndexName } from '#modules/search/domain/search_index_names'
import { searchClient } from '#modules/search/infra/search_client'

interface OrganizationSearchSource {
  organization_id: string
}

interface OrganizationEngineSearchInput {
  q: string
  limit: number
}

export class OrganizationSearchIndexRepository {
  readonly indexName = buildOrganizationSearchIndexName()

  async ensureIndex(): Promise<void> {
    const exists = await searchClient.indices.exists({ index: this.indexName })
    if (exists) {
      return
    }

    await searchClient.indices.create({
      index: this.indexName,
      mappings: {
        properties: {
          organization_id: { type: 'keyword' },
          name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          slug: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          description: { type: 'text' },
          website: { type: 'text' },
          logo: { type: 'keyword' },
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

  async upsertDocument(document: OrganizationSearchDocument): Promise<void> {
    await this.ensureIndex()
    await searchClient.index({
      index: this.indexName,
      id: document.organization_id,
      document,
      refresh: 'wait_for',
    })
  }

  async bulkUpsertDocuments(documents: OrganizationSearchDocument[]): Promise<void> {
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
            _id: document.organization_id,
          },
        },
        document,
      ]),
    })
  }

  async deleteDocument(organizationId: string): Promise<void> {
    const exists = await searchClient.indices.exists({ index: this.indexName })
    if (!exists) {
      return
    }

    await searchClient.delete(
      {
        index: this.indexName,
        id: organizationId,
        refresh: 'wait_for',
      },
      { ignore: [404] }
    )
  }

  async search(input: OrganizationEngineSearchInput): Promise<OrganizationSearchHit[]> {
    await this.ensureIndex()

    const query: estypes.QueryDslQueryContainer = {
      bool: {
        should: [
          {
            multi_match: {
              query: input.q,
              fields: ['name^5', 'slug^4', 'description^2', 'website'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          },
          {
            multi_match: {
              query: input.q,
              fields: ['name^5', 'slug^4', 'description^2', 'website'],
              type: 'phrase_prefix',
            },
          },
        ],
        minimum_should_match: 1,
        must_not: [{ exists: { field: 'deleted_at' } }],
      },
    }

    const response = await searchClient.search<OrganizationSearchSource>({
      index: this.indexName,
      size: input.limit,
      query,
      _source: ['organization_id'],
    })

    return response.hits.hits.flatMap((hit) => {
      const organizationId = hit._source?.organization_id
      if (!organizationId) {
        return []
      }

      return [{ organizationId, score: hit._score ?? 0 }]
    })
  }
}
