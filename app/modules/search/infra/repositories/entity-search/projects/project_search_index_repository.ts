import type { estypes } from '@elastic/elasticsearch'

import type { SearchIndexCutoverFencePort } from '#modules/search/actions/ports/outbound/search_index_cutover_fence_port'
import type {
  ProjectSearchDocument,
  ProjectSearchHit,
} from '#modules/search/domain/entity-search/project_search_document'
import { bulkIndexSearchDocuments } from '#modules/search/infra/adapters/projection-generation/search_bulk_indexer'
import {
  buildProjectSearchIndexName,
  buildProjectSearchPhysicalIndexName,
} from '#modules/search/infra/adapters/index-administration/search_index_names'
import { VersionedSearchIndexLifecycle } from '#modules/search/infra/adapters/index-administration/versioned_search_index_lifecycle'
import type { SearchProjectionWriteContext } from '#modules/search/public_contracts/search_public_api'
import { searchClient } from '#platform/search/elasticsearch_client'

interface ProjectSearchSource {
  project_id: string
}

interface ProjectEngineSearchInput {
  q: string
  limit: number
}

function validateExternalVersion(externalVersion: number | undefined): void {
  if (
    externalVersion !== undefined &&
    (!Number.isSafeInteger(externalVersion) || externalVersion < 1)
  ) {
    throw new RangeError('Project search external version must be a positive safe integer')
  }
}

function validateTombstoneContext(context: SearchProjectionWriteContext): void {
  if (context.externalVersion === undefined) {
    if (context.tombstoneAt !== undefined) {
      throw new RangeError('Project search tombstone requires an external version')
    }
    return
  }
  if (context.tombstoneAt === undefined || Number.isNaN(Date.parse(context.tombstoneAt))) {
    throw new RangeError('Version-fenced project deletion requires an ISO tombstone timestamp')
  }
}

export class ProjectSearchIndexRepository {
  readonly indexName = buildProjectSearchIndexName()
  readonly physicalIndexName = buildProjectSearchPhysicalIndexName()
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
      },
      signal
    )
  }

  async resetIndex(): Promise<void> {
    await this.lifecycle.resetIndex()
  }

  async upsertDocument(
    document: ProjectSearchDocument,
    context: SearchProjectionWriteContext = {}
  ): Promise<void> {
    validateExternalVersion(context.externalVersion)
    context.signal?.throwIfAborted()
    await this.ensureIndex(context.signal)
    await this.client.index(
      {
        index: this.indexName,
        id: document.project_id,
        document,
        refresh: 'wait_for',
        ...(context.externalVersion === undefined
          ? {}
          : {
              version: context.externalVersion,
              version_type: 'external_gte' as const,
            }),
      },
      context.signal ? { signal: context.signal } : undefined
    )
  }

  async bulkUpsertDocuments(documents: ProjectSearchDocument[]): Promise<void> {
    if (documents.length === 0) {
      return
    }

    await this.ensureIndex()
    await bulkIndexSearchDocuments(this.client, {
      indexName: this.indexName,
      documents,
      documentId: (document) => document.project_id,
      refresh: true,
    })
  }

  async replaceAllDocuments(documents: ProjectSearchDocument[]): Promise<void> {
    await this.ensureIndex()
    await this.lifecycle.rebuildIndex(async (physicalIndexName) => {
      await bulkIndexSearchDocuments(this.client, {
        indexName: physicalIndexName,
        documents,
        documentId: (document) => document.project_id,
      })
      return documents.length
    })
  }

  async deleteDocument(
    projectId: string,
    context: SearchProjectionWriteContext = {}
  ): Promise<void> {
    validateExternalVersion(context.externalVersion)
    validateTombstoneContext(context)
    context.signal?.throwIfAborted()
    await this.ensureIndex(context.signal)
    if (context.externalVersion !== undefined) {
      await this.client.index(
        {
          index: this.indexName,
          id: projectId,
          document: {
            project_id: projectId,
            deleted_at: context.tombstoneAt,
          },
          refresh: 'wait_for',
          version: context.externalVersion,
          version_type: 'external_gte',
        },
        context.signal ? { signal: context.signal } : undefined
      )
      return
    }
    await this.client.delete(
      {
        index: this.indexName,
        id: projectId,
        refresh: 'wait_for',
      },
      {
        ignore: [404],
        ...(context.signal ? { signal: context.signal } : {}),
      }
    )
  }

  async search(input: ProjectEngineSearchInput): Promise<ProjectSearchHit[]> {
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

    const response = await this.client.search<ProjectSearchSource>({
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
