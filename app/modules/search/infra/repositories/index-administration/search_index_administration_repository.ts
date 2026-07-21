import type { Client } from '@elastic/elasticsearch'

import type {
  ActivateSearchIndexInput,
  DeleteRetiredSearchIndicesInput,
  SearchIndexAdministrationPort,
  SearchIndexDescriptor,
  SearchIndexGenerationRecord,
  SearchIndexInventory,
} from '#modules/search/actions/ports/outbound/search_index_administration_port'
import type { SearchIndexCutoverFencePort } from '#modules/search/actions/ports/outbound/search_index_cutover_fence_port'
import { SearchIndexAdministrationError } from '#modules/search/domain/index-administration/search_index_administration_error'
import { isOwnedSearchPhysicalIndex } from '#modules/search/infra/adapters/index-administration/search_index_names'

function canonicalIndexNames(indexNames: string[]): string[] {
  return [...new Set(indexNames)].sort()
}

function sameIndexNames(left: string[], right: string[]): boolean {
  const canonicalLeft = canonicalIndexNames(left)
  const canonicalRight = canonicalIndexNames(right)
  return (
    canonicalLeft.length === canonicalRight.length &&
    canonicalLeft.every((indexName, index) => indexName === canonicalRight[index])
  )
}

function readCreationDate(indexDefinition: unknown): string | null {
  if (
    typeof indexDefinition !== 'object' ||
    indexDefinition === null ||
    !('settings' in indexDefinition)
  ) {
    return null
  }
  const settings = indexDefinition.settings
  if (typeof settings !== 'object' || settings === null || !('index' in settings)) {
    return null
  }
  const indexSettings = settings.index
  if (
    typeof indexSettings !== 'object' ||
    indexSettings === null ||
    !('creation_date' in indexSettings) ||
    typeof indexSettings.creation_date !== 'string'
  ) {
    return null
  }
  const creationTime = Number(indexSettings.creation_date)
  if (!Number.isSafeInteger(creationTime) || creationTime < 0) {
    return null
  }
  return new Date(creationTime).toISOString()
}

export class ElasticsearchSearchIndexAdministrationRepository implements SearchIndexAdministrationPort {
  constructor(
    private readonly client: Client,
    private readonly cutoverFence?: SearchIndexCutoverFencePort
  ) {}

  async inspect(descriptor: SearchIndexDescriptor): Promise<SearchIndexInventory> {
    const activeIndexNames = await this.readActiveIndexNames(descriptor.aliasName)
    const indices = await this.client.indices.get({
      index: `${descriptor.aliasName}_*`,
      allow_no_indices: true,
      ignore_unavailable: true,
      expand_wildcards: ['open', 'closed'],
    })
    const ownedEntries = Object.entries(indices)
      .filter(([indexName]) => isOwnedSearchPhysicalIndex(descriptor, indexName))
      .sort(([left], [right]) => left.localeCompare(right))
    const generations = await Promise.all(
      ownedEntries.map(async ([indexName, definition]): Promise<SearchIndexGenerationRecord> => {
        const count = await this.client.count({ index: indexName })
        const definitionAliases = definition.aliases ?? {}
        const aliases = Object.keys(definitionAliases).sort()
        const aliasDefinition = (
          definitionAliases as Record<string, { is_write_index?: boolean } | undefined>
        )[descriptor.aliasName]
        return {
          indexName,
          active: activeIndexNames.includes(indexName),
          writeIndex: aliasDefinition?.is_write_index === true,
          aliases,
          documentCount: count.count,
          createdAt: readCreationDate(definition),
        }
      })
    )

    return {
      target: descriptor.target,
      aliasName: descriptor.aliasName,
      initialPhysicalIndexName: descriptor.initialPhysicalIndexName,
      activeIndexNames,
      generations,
    }
  }

  async deleteRetired(input: DeleteRetiredSearchIndicesInput): Promise<void> {
    await this.runCutoverFence(input.descriptor.aliasName, () =>
      this.deleteRetiredFenced(input)
    )
  }

  private async deleteRetiredFenced(input: DeleteRetiredSearchIndicesInput): Promise<void> {
    const indexNames = canonicalIndexNames(input.indexNames)
    if (
      indexNames.length === 0 ||
      indexNames.some((indexName) => !isOwnedSearchPhysicalIndex(input.descriptor, indexName))
    ) {
      throw new SearchIndexAdministrationError(
        'SEARCH_INDEX_DELETE_TARGET_UNSAFE',
        'Search index cleanup contains an empty or unowned physical index target'
      )
    }

    const inventory = await this.inspect(input.descriptor)
    if (!sameIndexNames(inventory.activeIndexNames, input.expectedActiveIndexNames)) {
      throw new SearchIndexAdministrationError(
        'SEARCH_INDEX_CLEANUP_STATE_CHANGED',
        'Search index alias state changed after the cleanup plan was created'
      )
    }
    const generationByName = new Map(
      inventory.generations.map((generation) => [generation.indexName, generation])
    )
    for (const indexName of indexNames) {
      const generation = generationByName.get(indexName)
      if (!generation || generation.active || generation.aliases.length > 0) {
        throw new SearchIndexAdministrationError(
          'SEARCH_INDEX_DELETE_TARGET_UNSAFE',
          `Search index cleanup target is active, aliased, missing, or unowned: ${indexName}`
        )
      }
    }

    await this.client.indices.delete({ index: indexNames })
  }

  async activate(input: ActivateSearchIndexInput): Promise<void> {
    await this.runCutoverFence(input.descriptor.aliasName, () => this.activateFenced(input))
  }

  private async activateFenced(input: ActivateSearchIndexInput): Promise<void> {
    if (
      !isOwnedSearchPhysicalIndex(input.descriptor, input.targetIndexName) ||
      input.expectedCurrentIndexName === input.targetIndexName
    ) {
      throw new SearchIndexAdministrationError(
        'SEARCH_INDEX_ROLLBACK_TARGET_INVALID',
        'Search rollback target must be a different owned physical index'
      )
    }

    const inventory = await this.inspect(input.descriptor)
    if (
      inventory.activeIndexNames.length !== 1 ||
      inventory.activeIndexNames[0] !== input.expectedCurrentIndexName
    ) {
      throw new SearchIndexAdministrationError(
        'SEARCH_INDEX_ROLLBACK_CURRENT_MISMATCH',
        'Search rollback current index confirmation does not match the active alias'
      )
    }
    const target = inventory.generations.find(
      (generation) => generation.indexName === input.targetIndexName
    )
    if (!target || target.active || target.aliases.length > 0) {
      throw new SearchIndexAdministrationError(
        'SEARCH_INDEX_ROLLBACK_TARGET_INVALID',
        'Search rollback target is missing, active, or attached to an alias'
      )
    }

    await this.client.indices.updateAliases({
      actions: [
        {
          remove: {
            index: input.expectedCurrentIndexName,
            alias: input.descriptor.aliasName,
            must_exist: true,
          },
        },
        {
          add: {
            index: input.targetIndexName,
            alias: input.descriptor.aliasName,
            is_write_index: true,
          },
        },
      ],
    })

    const resultingActiveIndices = await this.readActiveIndexNames(input.descriptor.aliasName)
    if (!sameIndexNames(resultingActiveIndices, [input.targetIndexName])) {
      throw new SearchIndexAdministrationError(
        'SEARCH_INDEX_ALIAS_STATE_INCONSISTENT',
        'Search rollback alias state is inconsistent after the atomic update'
      )
    }
  }

  private async readActiveIndexNames(aliasName: string): Promise<string[]> {
    const aliasExists = await this.client.indices.existsAlias({ name: aliasName })
    if (!aliasExists) {
      return []
    }
    const aliases = await this.client.indices.getAlias({ name: aliasName })
    return Object.keys(aliases).sort()
  }

  private runCutoverFence<T>(aliasName: string, callback: () => Promise<T>): Promise<T> {
    return this.cutoverFence ? this.cutoverFence.runExclusive(aliasName, callback) : callback()
  }
}
