import type { estypes } from '@elastic/elasticsearch'

import { TALENT_SEARCH_DISCOVERY_TEXT_FIELDS } from '../../../adapters/search-discovery/talents/talent_search_discovery_bindings.js'

import type { SearchIndexCutoverFencePort } from '#modules/search/actions/ports/outbound/search_index_cutover_fence_port'
import type {
  TalentSearchDocument,
  TalentSearchHit,
} from '#modules/search/domain/entity-search/talent_search_document'
import {
  buildTalentSearchIndexName,
  buildTalentSearchPhysicalIndexName,
  isOwnedSearchPhysicalIndex,
} from '#modules/search/infra/adapters/index-administration/search_index_names'
import { VersionedSearchIndexLifecycle } from '#modules/search/infra/adapters/index-administration/versioned_search_index_lifecycle'
import { bulkIndexSearchDocuments } from '#modules/search/infra/adapters/projection-generation/search_bulk_indexer'
import type { SearchProjectionWriteContext } from '#modules/search/public_contracts/search_public_api'
import { searchClient } from '#platform/search/elasticsearch_client'

interface TalentEngineSearchInput {
  q: string
  limit: number
}

interface TalentSearchSource {
  user_id: string
}

export const TALENT_SEARCH_INDEX_MAPPINGS: estypes.MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    user_id: { type: 'keyword' },
    username: { type: 'text', fields: { keyword: { type: 'keyword' } } },
    display_name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
    headline: { type: 'text' },
    bio: { type: 'text' },
    status: { type: 'keyword' },
    is_searchable: { type: 'boolean' },
    is_active: { type: 'boolean' },
    skill_ids: { type: 'keyword' },
    skill_ids_known: { type: 'boolean' },
    skill_ids_count: { type: 'integer' },
    skills_text: { type: 'text' },
    canonical_skill_ids: { type: 'keyword' },
    canonical_skill_ids_known: { type: 'boolean' },
    canonical_skill_ids_count: { type: 'integer' },
    skill_category_refs: { type: 'keyword' },
    skill_category_refs_known: { type: 'boolean' },
    skill_category_refs_count: { type: 'integer' },
    approved_skill_aliases_text: { type: 'text' },
    skill_evidence: {
      type: 'nested',
      properties: {
        skill_id: { type: 'keyword' },
        proficiency_code: { type: 'keyword' },
        proficiency_order: { type: 'integer' },
        source: { type: 'keyword' },
        review_state: { type: 'keyword' },
      },
    },
    skill_evidence_known: { type: 'boolean' },
    skill_taxonomy_versions: { type: 'keyword' },
    skill_assignment_provenance: { type: 'keyword' },
    skill_assignment_review_states: { type: 'keyword' },
    accomplishments_text: { type: 'text' },
    business_domains: { type: 'keyword', fields: { text: { type: 'text' } } },
    business_domains_known: { type: 'boolean' },
    business_domains_count: { type: 'integer' },
    problem_categories: { type: 'keyword', fields: { text: { type: 'text' } } },
    problem_categories_known: { type: 'boolean' },
    problem_categories_count: { type: 'integer' },
    task_types: { type: 'keyword', fields: { text: { type: 'text' } } },
    task_types_known: { type: 'boolean' },
    task_types_count: { type: 'integer' },
    technologies: { type: 'keyword', fields: { text: { type: 'text' } } },
    technologies_known: { type: 'boolean' },
    technologies_count: { type: 'integer' },
    trust_score: { type: 'float' },
    completed_tasks: { type: 'integer' },
    reviewed_skills_count: { type: 'integer' },
    imported_skills_count: { type: 'integer' },
    under_dispute_skills_count: { type: 'integer' },
    latest_confidence_signal: { type: 'keyword' },
    available_from: { type: 'date' },
    updated_at: { type: 'date' },
  },
}

export class TalentSearchIndexMigrationRequiredError extends Error {
  override readonly name = 'TalentSearchIndexMigrationRequiredError'
  readonly code = 'TALENT_SEARCH_INDEX_MIGRATION_REQUIRED'

  constructor(readonly issues: string[]) {
    super(
      'Talent Search index mapping requires a populated generation rebuild before reads or writes: ' +
        issues.join(', ')
    )
  }
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
    await this.lifecycle.ensureIndex({ mappings: TALENT_SEARCH_INDEX_MAPPINGS }, signal)
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

  async resolveActiveIndexTarget(): Promise<{
    physicalIndexName: string
    generation: string
  }> {
    const backingIndices = await this.lifecycle.getBackingIndices()
    const physicalIndexName = backingIndices[0]
    if (backingIndices.length !== 1 || physicalIndexName === undefined) {
      throw new TalentSearchIndexMigrationRequiredError([
        `${this.indexName}:alias_backing_count:expected_1_found_${backingIndices.length}`,
      ])
    }
    if (
      !isOwnedSearchPhysicalIndex(
        {
          aliasName: this.indexName,
          initialPhysicalIndexName: this.physicalIndexName,
        },
        physicalIndexName
      )
    ) {
      throw new TalentSearchIndexMigrationRequiredError([
        `${this.indexName}:alias_backing_unowned:${physicalIndexName}`,
      ])
    }

    return { physicalIndexName, generation: physicalIndexName }
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
              fields: [...TALENT_SEARCH_DISCOVERY_TEXT_FIELDS],
              type: 'best_fields',
              ...(shouldUseFuzzyMatching(input.q) ? { fuzziness: 'AUTO' } : {}),
            },
          },
          {
            multi_match: {
              query: input.q,
              fields: [...TALENT_SEARCH_DISCOVERY_TEXT_FIELDS],
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

function shouldUseFuzzyMatching(query: string): boolean {
  return Array.from(query.trim()).length >= 4
}
