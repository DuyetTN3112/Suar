import type { estypes } from '@elastic/elasticsearch'

import type { SearchIndexCutoverFencePort } from '#modules/search/actions/ports/outbound/search_index_cutover_fence_port'
import type {
  UserDirectorySearchDocument,
  UserDirectorySearchHit,
} from '#modules/search/domain/user_directory_search_document'
import { bulkIndexSearchDocuments } from '#modules/search/infra/search_bulk_indexer'
import {
  buildUserDirectorySearchIndexName,
  buildUserDirectorySearchPhysicalIndexName,
} from '#modules/search/infra/search_index_names'
import { VersionedSearchIndexLifecycle } from '#modules/search/infra/versioned_search_index_lifecycle'
import type { SearchProjectionWriteContext } from '#modules/search/public_contracts/search_public_api'
import { searchClient } from '#platform/search/elasticsearch_client'

interface UserDirectorySearchSource {
  user_id: string
}

interface UserDirectoryEngineSearchInput {
  q: string
  limit: number
}

function requireExternalVersion(context: SearchProjectionWriteContext): number {
  const version = context.externalVersion
  if (!Number.isSafeInteger(version) || (version ?? 0) < 1) {
    throw new RangeError('User directory search external version must be a positive safe integer')
  }
  return version as number
}

function requireTombstoneAt(context: SearchProjectionWriteContext): string {
  if (!context.tombstoneAt || Number.isNaN(Date.parse(context.tombstoneAt))) {
    throw new RangeError('User directory deletion fence requires an ISO tombstone timestamp')
  }
  return context.tombstoneAt
}

export class UserDirectorySearchIndexRepository {
  readonly indexName = buildUserDirectorySearchIndexName()
  readonly physicalIndexName = buildUserDirectorySearchPhysicalIndexName()
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
        settings: {
          analysis: {
            tokenizer: {
              suar_identifier_tokenizer: {
                type: 'pattern',
                pattern: '[^\\p{L}\\p{N}]+',
              },
            },
            analyzer: {
              suar_identifier: {
                type: 'custom',
                tokenizer: 'suar_identifier_tokenizer',
                filter: ['lowercase', 'asciifolding'],
              },
            },
          },
        },
        mappings: {
          properties: {
            user_id: { type: 'keyword' },
            username: {
              type: 'text',
              analyzer: 'suar_identifier',
              search_analyzer: 'suar_identifier',
              fields: { keyword: { type: 'keyword' } },
            },
            email: {
              type: 'text',
              analyzer: 'suar_identifier',
              search_analyzer: 'suar_identifier',
              fields: { keyword: { type: 'keyword' } },
            },
            status: { type: 'keyword' },
            deleted_at: { type: 'date' },
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

  async upsertDocument(document: UserDirectorySearchDocument): Promise<void> {
    await this.ensureIndex()
    await this.client.index({
      index: this.indexName,
      id: document.user_id,
      document,
      refresh: 'wait_for',
    })
  }

  async upsertDocumentFenced(
    document: UserDirectorySearchDocument,
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

  async bulkUpsertDocuments(documents: UserDirectorySearchDocument[]): Promise<void> {
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

  async replaceAllDocuments(documents: UserDirectorySearchDocument[]): Promise<void> {
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

  async deleteDocument(userId: string): Promise<void> {
    const exists = await this.client.indices.exists({ index: this.indexName })
    if (!exists) {
      return
    }

    await this.client.delete(
      {
        index: this.indexName,
        id: userId,
        refresh: 'wait_for',
      },
      { ignore: [404] }
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
          deleted_at: tombstoneAt,
        },
        refresh: 'wait_for',
        version,
        version_type: 'external_gte',
      },
      context.signal ? { signal: context.signal } : undefined
    )
  }

  async search(input: UserDirectoryEngineSearchInput): Promise<UserDirectorySearchHit[]> {
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

    const response = await this.client.search<UserDirectorySearchSource>({
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
