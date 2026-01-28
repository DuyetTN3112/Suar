import { randomUUID } from 'node:crypto'

import type { Client, estypes } from '@elastic/elasticsearch'

import type { SearchIndexCutoverFencePort } from '#modules/search/actions/ports/outbound/search_index_cutover_fence_port'
import {
  buildSearchGenerationIndexName,
  isOwnedSearchPhysicalIndex,
} from '#modules/search/infra/search_index_names'

export interface SearchIndexDefinition {
  mappings: estypes.MappingTypeMapping
  settings?: estypes.IndicesIndexSettings
}

export interface SearchIndexRebuildResult {
  activatedIndexName: string
  previousIndexNames: string[]
  documentCount: number
}

export class SearchIndexLifecycleError extends Error {
  override readonly name = 'SearchIndexLifecycleError'

  constructor(
    readonly code:
      | 'SEARCH_INDEX_NOT_ENSURED'
      | 'SEARCH_INDEX_GENERATION_MISSING'
      | 'SEARCH_INDEX_REBUILD_COUNT_MISMATCH'
      | 'SEARCH_INDEX_ALIAS_BACKING_UNOWNED'
      | 'SEARCH_INDEX_ALIAS_STATE_CHANGED'
      | 'SEARCH_INDEX_ALIAS_STATE_INCONSISTENT',
    message: string
  ) {
    super(message)
  }
}

function isResourceAlreadyExistsError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('meta' in error)) {
    return false
  }
  const meta = error.meta
  if (typeof meta !== 'object' || meta === null || !('body' in meta)) {
    return false
  }
  const body = meta.body
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return false
  }
  const bodyError = body.error
  return (
    typeof bodyError === 'object' &&
    bodyError !== null &&
    'type' in bodyError &&
    bodyError.type === 'resource_already_exists_exception'
  )
}

/**
 * Owns the stable alias -> versioned physical index boundary.
 *
 * The initial physical name deliberately matches the legacy `*_v1` index so an
 * existing installation can be adopted by adding an alias without copying or
 * deleting data. Later generations can be populated independently and promoted
 * with one atomic Elasticsearch aliases operation.
 */
export class VersionedSearchIndexLifecycle {
  private currentDefinition?: SearchIndexDefinition

  constructor(
    private readonly client: Client,
    readonly aliasName: string,
    readonly initialPhysicalIndexName: string,
    private readonly cutoverFence?: SearchIndexCutoverFencePort
  ) {}

  async ensureIndex(definition: SearchIndexDefinition, signal?: AbortSignal): Promise<void> {
    this.currentDefinition = definition
    const requestOptions = signal ? { signal } : undefined
    const aliasExists = await this.client.indices.existsAlias(
      { name: this.aliasName },
      requestOptions
    )
    if (aliasExists) {
      return
    }

    const physicalExists = await this.client.indices.exists(
      { index: this.initialPhysicalIndexName },
      requestOptions
    )
    if (!physicalExists) {
      try {
        await this.client.indices.create(
          {
            index: this.initialPhysicalIndexName,
            ...(definition.settings ? { settings: definition.settings } : {}),
            mappings: definition.mappings,
            aliases: {
              [this.aliasName]: {
                is_write_index: true,
              },
            },
          },
          requestOptions
        )
        return
      } catch (error) {
        if (!isResourceAlreadyExistsError(error)) {
          throw error
        }
      }
    }

    const aliasCreatedByConcurrentOwner = await this.client.indices.existsAlias(
      { name: this.aliasName },
      requestOptions
    )
    if (aliasCreatedByConcurrentOwner) {
      return
    }

    await this.client.indices.updateAliases(
      {
        actions: [
          {
            add: {
              index: this.initialPhysicalIndexName,
              alias: this.aliasName,
              is_write_index: true,
            },
          },
        ],
      },
      requestOptions
    )
  }

  async resetIndex(): Promise<void> {
    await this.runCutoverFence(async () => {
      const backingIndices = await this.getBackingIndices()
      const ownedPhysicalIndices = await this.getOwnedPhysicalIndices()
      const resetTargets = [...new Set([...backingIndices, ...ownedPhysicalIndices])]
        .filter((indexName) =>
          isOwnedSearchPhysicalIndex(
            {
              aliasName: this.aliasName,
              initialPhysicalIndexName: this.initialPhysicalIndexName,
            },
            indexName
          )
        )
        .sort()
      if (resetTargets.length > 0) {
        await this.client.indices.delete({ index: resetTargets })
      }
    })
  }

  async createGeneration(generation: string, definition: SearchIndexDefinition): Promise<string> {
    const physicalIndexName = buildSearchGenerationIndexName(this.aliasName, generation)
    await this.client.indices.create({
      index: physicalIndexName,
      ...(definition.settings ? { settings: definition.settings } : {}),
      mappings: definition.mappings,
    })
    return physicalIndexName
  }

  async rebuildIndex(
    populate: (physicalIndexName: string) => Promise<number>,
    generation = this.buildGeneration()
  ): Promise<SearchIndexRebuildResult> {
    const definition = this.currentDefinition
    if (!definition) {
      throw new SearchIndexLifecycleError(
        'SEARCH_INDEX_NOT_ENSURED',
        'Search index must be ensured before rebuilding a generation'
      )
    }

    const previousIndexNames = await this.getBackingIndices()
    const physicalIndexName = await this.createGeneration(generation, definition)
    const expectedDocumentCount = await populate(physicalIndexName)
    if (!Number.isSafeInteger(expectedDocumentCount) || expectedDocumentCount < 0) {
      throw new RangeError('Search rebuild document count must be a non-negative safe integer')
    }

    await this.client.indices.refresh({ index: physicalIndexName })
    const count = await this.client.count({ index: physicalIndexName })
    if (count.count !== expectedDocumentCount) {
      throw new SearchIndexLifecycleError(
        'SEARCH_INDEX_REBUILD_COUNT_MISMATCH',
        `Search rebuild verification failed for ${physicalIndexName}: expected ` +
          `${String(expectedDocumentCount)} documents, found ${String(count.count)}`
      )
    }

    await this.activateGeneration(physicalIndexName, previousIndexNames)
    return {
      activatedIndexName: physicalIndexName,
      previousIndexNames,
      documentCount: count.count,
    }
  }

  async activateGeneration(
    physicalIndexName: string,
    expectedCurrentIndexNames?: string[]
  ): Promise<void> {
    this.assertOwnedGeneration(physicalIndexName)
    await this.runCutoverFence(async () => {
      const physicalExists = await this.client.indices.exists({ index: physicalIndexName })
      if (!physicalExists) {
        throw new SearchIndexLifecycleError(
          'SEARCH_INDEX_GENERATION_MISSING',
          `Cannot activate missing search index generation: ${physicalIndexName}`
        )
      }

      const backingIndices = await this.getBackingIndices()
      if (
        expectedCurrentIndexNames &&
        !this.sameIndexNames(backingIndices, expectedCurrentIndexNames)
      ) {
        throw new SearchIndexLifecycleError(
          'SEARCH_INDEX_ALIAS_STATE_CHANGED',
          `Search alias ${this.aliasName} changed before generation activation`
        )
      }
      const unownedBackingIndices = backingIndices.filter(
        (indexName) =>
          !isOwnedSearchPhysicalIndex(
            {
              aliasName: this.aliasName,
              initialPhysicalIndexName: this.initialPhysicalIndexName,
            },
            indexName
          )
      )
      if (unownedBackingIndices.length > 0) {
        throw new SearchIndexLifecycleError(
          'SEARCH_INDEX_ALIAS_BACKING_UNOWNED',
          `Search alias ${this.aliasName} has unowned backing indices: ` +
            unownedBackingIndices.join(', ')
        )
      }

      await this.client.indices.updateAliases({
        actions: [
          ...backingIndices.map((index) => ({
            remove: {
              index,
              alias: this.aliasName,
              must_exist: true,
            },
          })),
          {
            add: {
              index: physicalIndexName,
              alias: this.aliasName,
              is_write_index: true,
            },
          },
        ],
      })

      const resultingBackingIndices = await this.getBackingIndices()
      if (
        resultingBackingIndices.length !== 1 ||
        resultingBackingIndices[0] !== physicalIndexName
      ) {
        throw new SearchIndexLifecycleError(
          'SEARCH_INDEX_ALIAS_STATE_INCONSISTENT',
          `Search alias ${this.aliasName} did not activate exactly ${physicalIndexName}`
        )
      }
    })
  }

  async getBackingIndices(): Promise<string[]> {
    const aliasExists = await this.client.indices.existsAlias({ name: this.aliasName })
    if (!aliasExists) {
      return []
    }

    const aliases = await this.client.indices.getAlias({ name: this.aliasName })
    return Object.keys(aliases).sort()
  }

  private async getOwnedPhysicalIndices(): Promise<string[]> {
    const indices = await this.client.indices.get({
      index: `${this.aliasName}_*`,
      allow_no_indices: true,
      ignore_unavailable: true,
      expand_wildcards: ['open', 'closed'],
    })
    return Object.keys(indices)
      .filter((indexName) =>
        isOwnedSearchPhysicalIndex(
          {
            aliasName: this.aliasName,
            initialPhysicalIndexName: this.initialPhysicalIndexName,
          },
          indexName
        )
      )
      .sort()
  }

  private assertOwnedGeneration(physicalIndexName: string): void {
    if (
      !isOwnedSearchPhysicalIndex(
        {
          aliasName: this.aliasName,
          initialPhysicalIndexName: this.initialPhysicalIndexName,
        },
        physicalIndexName
      )
    ) {
      throw new RangeError(
        `Search index generation must be owned by alias ${this.aliasName}: ${physicalIndexName}`
      )
    }
  }

  private runCutoverFence<T>(callback: () => Promise<T>): Promise<T> {
    return this.cutoverFence
      ? this.cutoverFence.runExclusive(this.aliasName, callback)
      : callback()
  }

  private sameIndexNames(left: string[], right: string[]): boolean {
    const canonicalLeft = [...new Set(left)].sort()
    const canonicalRight = [...new Set(right)].sort()
    return (
      canonicalLeft.length === canonicalRight.length &&
      canonicalLeft.every((indexName, index) => indexName === canonicalRight[index])
    )
  }

  private buildGeneration(): string {
    const timestamp = new Date().toISOString().replaceAll(/[^0-9]/g, '')
    return `${timestamp}-${randomUUID()}`
  }
}
