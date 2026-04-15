import type { estypes } from '@elastic/elasticsearch'

import type { SearchIndexCutoverFencePort } from '#modules/search/actions/ports/outbound/search_index_cutover_fence_port'
import type {
  TalentSearchDocument,
  TalentSearchHit,
} from '#modules/search/domain/talent_search_document'
import { bulkIndexSearchDocuments } from '#modules/search/infra/search_bulk_indexer'
import {
  buildTalentSearchIndexName,
  buildTalentSearchPhysicalIndexName,
} from '#modules/search/infra/search_index_names'
import { VersionedSearchIndexLifecycle } from '#modules/search/infra/versioned_search_index_lifecycle'
import type { SearchProjectionWriteContext } from '#modules/search/public_contracts/search_public_api'
import { searchClient } from '#platform/search/elasticsearch_client'

interface TalentEngineSearchInput {
  q: string
  limit: number
}

interface TalentSearchSource {
  user_id: string
}

function requireExternalVersion(context: SearchProjectionWriteContext): number {
  const version = context.externalVersion
  if (!Number.isSafeInteger(version) || (version ?? 0) < 1) {
    throw new RangeError('Talent search external version must be a positive safe integer')
  }
  return version as number
}

function requireTombstoneAt(context: SearchProjectionWriteContext): string {
  if (!context.tombstoneAt || Number.isNaN(Date.parse(context.tombstoneAt))) {
    throw new RangeError('Talent search deletion fence requires an ISO tombstone timestamp')
  }
  return context.tombstoneAt
}

export class TalentSearchIndexRepository {
  readonly indexName = buildTalentSearchIndexName()
  readonly physicalIndexName = buildTalentSearchPhysicalIndexName()
  private readonly lifecycle: VersionedSearchIndexLifecycle

  constructor(
    private readonly client = searchClient,
    cutoverFence?: SearchIndexCutoverFencePort
  ) {
    this.lifecycle = new VersionedSearchIndexLifecycle(
      client,
      this.indexName,
      this.physicalIndexName,
      cutoverFence
    )
  }

  async ensureIndex(signal?: AbortSignal): Promise<void> {
    await this.lifecycle.ensureIndex(
      {
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
      },
      signal
    )
  }

  async resetIndex(): Promise<void> {
    await this.lifecycle.resetIndex()
  }

  async upsertDocument(document: TalentSearchDocument, signal?: AbortSignal): Promise<void> {
    await this.ensureIndex(signal)
    await this.client.index(
      {
        index: this.indexName,
        id: document.user_id,
        document,
        refresh: 'wait_for',
      },
      signal ? { signal } : undefined
    )
  }

  async upsertDocumentFenced(
    document: TalentSearchDocument,
    context: SearchProjectionWriteContext
  ): Promise<void> {
    const version = requireExternalVersion(context)
    context.signal?.throwIfAborted()
    await this.ensureIndex(context.signal)
    await this.client.index(
      {
        index: this.indexName,
        id: document.user_id,
        document,
        refresh: 'wait_for',
        version,
        version_type: 'external_gte',
      },
      context.signal ? { signal: context.signal } : undefined
    )
  }

  async bulkUpsertDocuments(documents: TalentSearchDocument[]): Promise<void> {
    if (documents.length === 0) {
      return
    }

    await this.ensureIndex()
    await bulkIndexSearchDocuments(this.client, {
      indexName: this.indexName,
      documents,
      documentId: (document) => document.user_id,
      refresh: true,
    })
  }

  async replaceAllDocuments(documents: TalentSearchDocument[]): Promise<void> {
    await this.ensureIndex()
    await this.lifecycle.rebuildIndex(async (physicalIndexName) => {
      await bulkIndexSearchDocuments(this.client, {
        indexName: physicalIndexName,
        documents,
        documentId: (document) => document.user_id,
      })
      return documents.length
    })
  }

  async deleteDocument(userId: string, signal?: AbortSignal): Promise<void> {
    const requestOptions = signal ? { signal } : undefined
    const exists = await this.client.indices.exists({ index: this.indexName }, requestOptions)
    if (!exists) {
      return
    }

    await this.client.delete(
      {
        index: this.indexName,
        id: userId,
        refresh: 'wait_for',
      },
      {
        ignore: [404],
        ...(signal ? { signal } : {}),
      }
    )
  }

  async deleteDocumentFenced(userId: string, context: SearchProjectionWriteContext): Promise<void> {
    const version = requireExternalVersion(context)
    const tombstoneAt = requireTombstoneAt(context)
    context.signal?.throwIfAborted()
    await this.ensureIndex(context.signal)
    await this.client.index(
      {
        index: this.indexName,
        id: userId,
        document: {
          user_id: userId,
          status: 'inactive',
          is_searchable: false,
          updated_at: tombstoneAt,
        },
        refresh: 'wait_for',
        version,
        version_type: 'external_gte',
      },
      context.signal ? { signal: context.signal } : undefined
    )
  }

  async search(input: TalentEngineSearchInput, signal?: AbortSignal): Promise<TalentSearchHit[]> {
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
        filter: [{ term: { is_searchable: true } }, { term: { status: 'active' } }],
      },
    }

    const response = await this.client.search<TalentSearchSource>(
      {
        index: this.indexName,
        size: input.limit,
        query,
        _source: ['user_id'],
      },
      signal ? { signal } : undefined
    )

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
