import type { estypes } from '@elastic/elasticsearch'

import type {
  ProjectSearchDocument,
  ProjectSearchHit,
} from '#modules/search/domain/project_search_document'
import { buildProjectSearchIndexName } from '#modules/search/domain/search_index_names'
import { searchClient } from '#modules/search/infra/search_client'

interface ProjectSearchSource {
  project_id: string
}

interface ProjectEngineSearchInput {
  q: string
  limit: number
}

export class ProjectSearchIndexRepository {
  readonly indexName = buildProjectSearchIndexName()

  async ensureIndex(): Promise<void> {
    const exists = await searchClient.indices.exists({ index: this.indexName })
    if (exists) {
      return
    }

    await searchClient.indices.create({
      index: this.indexName,
      mappings: {
        properties: {
          project_id: { type: 'keyword' },
          name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          description: { type: 'text' },
          visibility: { type: 'keyword' },
          status: { type: 'keyword' },
          organization_id: { type: 'keyword' },
          creator_id: { type: 'keyword' },
          manager_id: { type: 'keyword' },
          owner_id: { type: 'keyword' },
          tags_text: { type: 'text' },
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

  async upsertDocument(document: ProjectSearchDocument): Promise<void> {
    await this.ensureIndex()
    await searchClient.index({
      index: this.indexName,
      id: document.project_id,
      document,
      refresh: 'wait_for',
    })
  }

  async bulkUpsertDocuments(documents: ProjectSearchDocument[]): Promise<void> {
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
            _id: document.project_id,
          },
        },
        document,
      ]),
    })
  }

  async deleteDocument(projectId: string): Promise<void> {
    const exists = await searchClient.indices.exists({ index: this.indexName })
    if (!exists) {
      return
    }

    await searchClient.delete(
      {
        index: this.indexName,
        id: projectId,
        refresh: 'wait_for',
      },
      { ignore: [404] }
    )
  }

  async search(input: ProjectEngineSearchInput): Promise<ProjectSearchHit[]> {
    await this.ensureIndex()

    const query: estypes.QueryDslQueryContainer = {
      bool: {
        should: [
          {
            multi_match: {
              query: input.q,
              fields: ['name^5', 'description^3', 'tags_text^2'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          },
          {
            multi_match: {
              query: input.q,
              fields: ['name^5', 'description^3', 'tags_text^2'],
              type: 'phrase_prefix',
            },
          },
        ],
        minimum_should_match: 1,
        must_not: [{ exists: { field: 'deleted_at' } }],
      },
    }

    const response = await searchClient.search<ProjectSearchSource>({
      index: this.indexName,
      size: input.limit,
      query,
      _source: ['project_id'],
    })

    return response.hits.hits.flatMap((hit) => {
      const projectId = hit._source?.project_id
      if (!projectId) {
        return []
      }
      return [{ projectId, score: hit._score ?? 0 }]
    })
  }
}
