import { errors as elasticsearchErrors } from '@elastic/elasticsearch'

import type {
  NotificationProjectionIndexAdministration,
  NotificationProjectionRevision,
} from '#modules/notifications/actions/ports/outbound/notification_projection_writer'
import { NOTIFICATION_SEARCH_MAPPING } from '#modules/notifications/infra/search/notification_search_index_repository'
import { searchClient } from '#platform/search/elasticsearch_client'

interface CreatePhysicalIndexInput {
  index: string
  mappings: typeof NOTIFICATION_SEARCH_MAPPING
}

type AliasAction =
  | {
      remove: {
        index: string
        alias: string
        mustExist: boolean
      }
    }
  | {
      add: {
        index: string
        alias: string
        isWriteIndex?: boolean
      }
    }

interface UpdateAliasesInput {
  actions: AliasAction[]
}

interface RevisionSource {
  notificationId: string
  revision: number
  deleted: boolean
}

interface RevisionSearchHit {
  source: RevisionSource
  sort: [string]
}

interface PointInTimeSearchResult {
  pitId: string
  hits: RevisionSearchHit[]
}

export function isNotificationAliasNotFoundError(error: unknown): boolean {
  return error instanceof elasticsearchErrors.ResponseError && error.statusCode === 404
}

export interface NotificationProjectionAdminTransport {
  indexExists(index: string): Promise<boolean>
  createIndex(input: CreatePhysicalIndexInput): Promise<void>
  refresh(index: string): Promise<void>
  deleteIndex(index: string): Promise<void>
  updateAliases(input: UpdateAliasesInput): Promise<void>
  getAliasIndices(alias: string): Promise<string[]>
  openPointInTime(index: string): Promise<string>
  searchPointInTime(input: {
    pitId: string
    size: number
    searchAfter: [string] | null
  }): Promise<PointInTimeSearchResult>
  closePointInTime(pitId: string): Promise<void>
}

const defaultTransport: NotificationProjectionAdminTransport = {
  indexExists: (index) => searchClient.indices.exists({ index }),
  createIndex: async (input) => {
    await searchClient.indices.create({
      index: input.index,
      mappings: input.mappings,
    })
  },
  refresh: async (index) => {
    await searchClient.indices.refresh({ index })
  },
  deleteIndex: async (index) => {
    await searchClient.indices.delete({
      index,
    })
  },
  updateAliases: async (input) => {
    await searchClient.indices.updateAliases({
      actions: input.actions.map((action) => {
        if ('remove' in action) {
          return {
            remove: {
              index: action.remove.index,
              alias: action.remove.alias,
              must_exist: action.remove.mustExist,
            },
          }
        }
        return {
          add: {
            index: action.add.index,
            alias: action.add.alias,
            ...(action.add.isWriteIndex === undefined
              ? {}
              : { is_write_index: action.add.isWriteIndex }),
          },
        }
      }),
    })
  },
  getAliasIndices: async (alias) => {
    try {
      const aliases = await searchClient.indices.getAlias({ name: alias })
      return Object.keys(aliases).sort()
    } catch (error) {
      if (isNotificationAliasNotFoundError(error)) {
        return []
      }
      throw error
    }
  },
  openPointInTime: async (index) => {
    const response = await searchClient.openPointInTime({
      index,
      keep_alive: '1m',
    })
    return response.id
  },
  searchPointInTime: async (input) => {
    const response = await searchClient.search<RevisionSource>({
      size: input.size,
      pit: {
        id: input.pitId,
        keep_alive: '1m',
      },
      sort: [{ notificationId: 'asc' }],
      ...(input.searchAfter ? { search_after: input.searchAfter } : {}),
      track_total_hits: false,
      _source: ['notificationId', 'revision', 'deleted'],
    })
    const hits = response.hits.hits.map((hit) => {
      if (
        !hit._source ||
        typeof hit._source.notificationId !== 'string' ||
        !Number.isSafeInteger(hit._source.revision) ||
        typeof hit._source.deleted !== 'boolean' ||
        !Array.isArray(hit.sort) ||
        hit.sort.length < 1
      ) {
        throw new TypeError('Invalid notification projection revision search hit')
      }
      return {
        source: hit._source,
        sort: [String(hit.sort[0])] as [string],
      }
    })
    return {
      pitId: response.pit_id ?? input.pitId,
      hits,
    }
  },
  closePointInTime: async (pitId) => {
    await searchClient.closePointInTime({ id: pitId })
  },
}

export type { NotificationProjectionRevision } from '#modules/notifications/actions/ports/outbound/notification_projection_writer'

export class NotificationProjectionAdminRepository implements NotificationProjectionIndexAdministration {
  constructor(
    private readonly transport: NotificationProjectionAdminTransport = defaultTransport
  ) {}

  async ensurePhysicalIndex(index: string): Promise<void> {
    if (await this.transport.indexExists(index)) {
      return
    }
    await this.transport.createIndex({
      index,
      mappings: NOTIFICATION_SEARCH_MAPPING,
    })
  }

  async refresh(index: string): Promise<void> {
    await this.transport.refresh(index)
  }

  async deletePhysicalIndex(index: string): Promise<void> {
    if (!/^[a-z0-9][a-z0-9._-]{0,254}$/.test(index)) {
      throw new RangeError('Notification physical index must be an exact lowercase index name')
    }
    try {
      await this.transport.deleteIndex(index)
    } catch (error) {
      if (isNotificationAliasNotFoundError(error)) {
        return
      }
      throw error
    }
  }

  async aliasIndices(alias: string): Promise<string[]> {
    return this.transport.getAliasIndices(alias)
  }

  async swapAliases(input: {
    sourceIndex: string
    targetIndex: string
    readAlias: string
    writeAlias: string
  }): Promise<void> {
    await this.transport.updateAliases({
      actions: [
        {
          remove: {
            index: input.sourceIndex,
            alias: input.readAlias,
            mustExist: true,
          },
        },
        {
          remove: {
            index: input.sourceIndex,
            alias: input.writeAlias,
            mustExist: true,
          },
        },
        {
          add: {
            index: input.targetIndex,
            alias: input.readAlias,
          },
        },
        {
          add: {
            index: input.targetIndex,
            alias: input.writeAlias,
            isWriteIndex: true,
          },
        },
      ],
    })
  }

  async *scanRevisions(
    index: string,
    batchSize: number
  ): AsyncGenerator<NotificationProjectionRevision> {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
      throw new RangeError('Projection revision scan batch size must be between 1 and 1000')
    }

    let pitId = await this.transport.openPointInTime(index)
    let searchAfter: [string] | null = null
    try {
      for (;;) {
        const page = await this.transport.searchPointInTime({
          pitId,
          size: batchSize,
          searchAfter,
        })
        pitId = page.pitId
        if (page.hits.length === 0) {
          return
        }
        for (const hit of page.hits) {
          yield hit.source
        }
        searchAfter = page.hits.at(-1)?.sort ?? null
        if (!searchAfter) {
          throw new TypeError('Projection revision scan page had no sort boundary')
        }
      }
    } finally {
      await this.transport.closePointInTime(pitId)
    }
  }
}
