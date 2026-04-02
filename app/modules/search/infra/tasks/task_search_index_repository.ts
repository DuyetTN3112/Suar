import type { estypes } from '@elastic/elasticsearch'

import type { SearchIndexCutoverFencePort } from '#modules/search/actions/ports/outbound/search_index_cutover_fence_port'
import type { TaskSearchDocument, TaskSearchHit } from '#modules/search/domain/task_search_document'
import { bulkIndexSearchDocuments } from '#modules/search/infra/search_bulk_indexer'
import {
  buildTaskSearchIndexName,
  buildTaskSearchPhysicalIndexName,
} from '#modules/search/infra/search_index_names'
import { VersionedSearchIndexLifecycle } from '#modules/search/infra/versioned_search_index_lifecycle'
import { searchClient } from '#platform/search/elasticsearch_client'

interface TaskEngineSearchInput {
  q: string
  limit: number
  organizationId?: string
  publicOnly?: boolean
}

interface TaskSearchSource {
  task_id: string
}

export class TaskSearchIndexRepository {
  readonly indexName = buildTaskSearchIndexName()
  readonly physicalIndexName = buildTaskSearchPhysicalIndexName()
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
          task_id: { type: 'keyword' },
          organization_id: { type: 'keyword' },
          title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          description: { type: 'text' },
          acceptance_criteria: { type: 'text' },
          context_background: { type: 'text' },
          required_skill_ids: { type: 'keyword' },
          required_skills_text: { type: 'text' },
          business_domain: { type: 'keyword' },
          problem_category: { type: 'keyword' },
          task_type: { type: 'keyword' },
          difficulty: { type: 'keyword' },
          task_visibility: { type: 'keyword' },
          is_public: { type: 'boolean' },
          assigned_to: { type: 'keyword' },
          deleted_at: { type: 'date' },
          updated_at: { type: 'date' },
        },
      },
    })
  }

  async resetIndex(): Promise<void> {
    await this.lifecycle.resetIndex()
  }

  async upsertDocument(document: TaskSearchDocument): Promise<void> {
    await this.ensureIndex()
    await searchClient.index({
      index: this.indexName,
      id: document.task_id,
      document,
      refresh: 'wait_for',
    })
  }

  async bulkUpsertDocuments(documents: TaskSearchDocument[]): Promise<void> {
    if (documents.length === 0) {
      return
    }

    await this.ensureIndex()
    await bulkIndexSearchDocuments(searchClient, {
      indexName: this.indexName,
      documents,
      documentId: (document) => document.task_id,
      refresh: true,
    })
  }

  async replaceAllDocuments(documents: TaskSearchDocument[]): Promise<void> {
    await this.ensureIndex()
    await this.lifecycle.rebuildIndex(async (physicalIndexName) => {
      await bulkIndexSearchDocuments(searchClient, {
        indexName: physicalIndexName,
        documents,
        documentId: (document) => document.task_id,
      })
      return documents.length
    })
  }

  async deleteDocument(taskId: string): Promise<void> {
    const exists = await searchClient.indices.exists({ index: this.indexName })
    if (!exists) {
      return
    }

    await searchClient.delete(
      {
        index: this.indexName,
        id: taskId,
        refresh: 'wait_for',
      },
      { ignore: [404] }
    )
  }

  async search(input: TaskEngineSearchInput): Promise<TaskSearchHit[]> {
    const filters: estypes.QueryDslQueryContainer[] = []
    const mustNot: estypes.QueryDslQueryContainer[] = [{ exists: { field: 'deleted_at' } }]

    if (input.publicOnly) {
      filters.push({ term: { is_public: true } })
      mustNot.push({ exists: { field: 'assigned_to' } })
    }

    if (input.organizationId) {
      filters.push({ term: { organization_id: input.organizationId } })
    }

    const query: estypes.QueryDslQueryContainer = {
      bool: {
        should: [
          {
            multi_match: {
              query: input.q,
              fields: [
                'title^5',
                'required_skills_text^4',
                'acceptance_criteria^3',
                'description^2',
                'context_background',
              ],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          },
          {
            multi_match: {
              query: input.q,
              fields: [
                'title^5',
                'required_skills_text^4',
                'acceptance_criteria^3',
                'description^2',
                'context_background',
              ],
              type: 'phrase_prefix',
            },
          },
        ],
        minimum_should_match: 1,
        filter: filters,
        must_not: mustNot,
      },
    }

    const response = await searchClient.search<TaskSearchSource>({
      index: this.indexName,
      size: input.limit,
      query,
      _source: ['task_id'],
    })

    return response.hits.hits.flatMap((hit) => {
      const taskId = hit._source?.task_id
      if (!taskId) {
        return []
      }

      return [{ taskId, score: hit._score ?? 0 }]
    })
  }
}
