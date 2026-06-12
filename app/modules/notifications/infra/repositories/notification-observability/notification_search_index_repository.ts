import type { estypes } from '@elastic/elasticsearch'

import type {
  NotificationPhysicalPurgeResult,
  NotificationProjectionBatchResult,
  NotificationProjectionWriter,
} from '#modules/notifications/actions/ports/outbound/notification_projection_writer'
import type { NotificationSearchDocument } from '#modules/notifications/domain/notification-feed/notification_projection_document'
import { searchClient } from '#platform/search/elasticsearch_client'

export type {
  ActiveNotificationSearchDocument,
  DeletedNotificationSearchDocument,
  NotificationSearchDocument,
} from '#modules/notifications/domain/notification-feed/notification_projection_document'

export const NOTIFICATION_SEARCH_MAPPING = {
  dynamic: 'strict',
  properties: {
    notificationId: { type: 'keyword' },
    eventId: { type: 'keyword' },
    recipientId: { type: 'keyword' },
    scopeType: { type: 'keyword' },
    scopeId: { type: 'keyword' },
    organizationId: { type: 'keyword' },
    type: { type: 'keyword' },
    schemaVersion: { type: 'integer' },
    category: { type: 'keyword' },
    priority: { type: 'keyword' },
    state: { type: 'keyword' },
    title: { type: 'text', index: false },
    body: { type: 'text', index: false },
    relatedEntityType: { type: 'keyword' },
    relatedEntityId: { type: 'keyword' },
    action: { type: 'object', enabled: false },
    metadata: { type: 'object', enabled: false },
    occurredAt: { type: 'date' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    readAt: { type: 'date' },
    revision: { type: 'long' },
    projectionVersion: { type: 'integer' },
    deleted: { type: 'boolean' },
    deletedAt: { type: 'date' },
  },
} as const

interface NotificationBulkItemResult {
  index?: {
    _id?: string
    status: number
    error?: {
      type?: string
      reason?: string
    }
  }
  delete?: {
    _id?: string
    status: number
    error?: {
      type?: string
      reason?: string
    }
  }
}

interface NotificationBulkResponse {
  errors: boolean
  items: NotificationBulkItemResult[]
}

interface NotificationBulkInput {
  operations: NonNullable<estypes.BulkRequest['operations']>
  refresh?: boolean
}

interface NotificationCreateIndexInput {
  index: string
  aliases: Record<string, { is_write_index?: boolean }>
  mappings: typeof NOTIFICATION_SEARCH_MAPPING
}

export interface NotificationSearchTransport {
  indexExists(index: string): Promise<boolean>
  createIndex(input: NotificationCreateIndexInput): Promise<void>
  bulk(input: NotificationBulkInput): Promise<NotificationBulkResponse>
}

const defaultTransport: NotificationSearchTransport = {
  indexExists: (index) => searchClient.indices.exists({ index }),
  createIndex: async (input) => {
    await searchClient.indices.create({
      index: input.index,
      aliases: input.aliases,
      mappings: input.mappings,
    })
  },
  bulk: async (input) => {
    const response = await searchClient.bulk({
      operations: input.operations,
    })
    return response as NotificationBulkResponse
  },
}

const MAX_BULK_DOCUMENTS = 500
const MAX_BULK_BYTES = 5 * 1024 * 1024

export type {
  NotificationPhysicalPurgeResult,
  NotificationProjectionBatchResult,
  NotificationProjectionFailure,
} from '#modules/notifications/actions/ports/outbound/notification_projection_writer'

function isRetryableStatus(status: number, errorClass: string): boolean {
  return (
    status === 408 || status === 429 || status >= 500 || errorClass === 'index_not_found_exception'
  )
}

export class NotificationSearchIndexRepository implements NotificationProjectionWriter {
  constructor(private readonly transport: NotificationSearchTransport = defaultTransport) {}

  async ensureIndex(input: {
    physicalIndex: string
    readAlias: string
    writeAlias: string
  }): Promise<void> {
    if (await this.transport.indexExists(input.physicalIndex)) {
      return
    }

    await this.transport.createIndex({
      index: input.physicalIndex,
      aliases: {
        [input.readAlias]: {},
        [input.writeAlias]: { is_write_index: true },
      },
      mappings: NOTIFICATION_SEARCH_MAPPING,
    })
  }

  async projectMany(
    physicalIndex: string,
    documents: NotificationSearchDocument[]
  ): Promise<NotificationProjectionBatchResult> {
    if (documents.length === 0) {
      return { appliedIds: [], staleIds: [], failures: [] }
    }
    if (documents.length > MAX_BULK_DOCUMENTS) {
      throw new RangeError(
        `Notification Elasticsearch bulk cannot exceed ${MAX_BULK_DOCUMENTS} documents`
      )
    }

    const chunks: NotificationSearchDocument[][] = []
    let currentChunk: NotificationSearchDocument[] = []
    let currentBytes = 0
    for (const document of documents) {
      const documentBytes =
        Buffer.byteLength(
          JSON.stringify({
            index: {
              _index: physicalIndex,
              _id: document.notificationId,
              version: document.revision,
              version_type: 'external',
            },
          }),
          'utf8'
        ) +
        Buffer.byteLength(JSON.stringify(document), 'utf8') +
        2
      if (documentBytes > MAX_BULK_BYTES) {
        throw new RangeError(
          `Notification Elasticsearch document ${document.notificationId} exceeds the 5 MiB bulk budget`
        )
      }
      if (
        currentChunk.length >= MAX_BULK_DOCUMENTS ||
        (currentChunk.length > 0 && currentBytes + documentBytes > MAX_BULK_BYTES)
      ) {
        chunks.push(currentChunk)
        currentChunk = []
        currentBytes = 0
      }
      currentChunk.push(document)
      currentBytes += documentBytes
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk)
    }

    const result: NotificationProjectionBatchResult = {
      appliedIds: [],
      staleIds: [],
      failures: [],
    }
    for (const chunk of chunks) {
      const response = await this.transport.bulk({
        operations: chunk.flatMap((document) => [
          {
            index: {
              _index: physicalIndex,
              _id: document.notificationId,
              version: document.revision,
              version_type: 'external',
            },
          },
          document,
        ]),
      })
      if (response.items.length !== chunk.length) {
        result.failures.push(
          ...chunk.map((document) => ({
            notificationId: document.notificationId,
            retryable: true,
            status: 502,
            errorClass: 'invalid_bulk_response',
            errorMessage: 'Elasticsearch bulk response item count did not match the request',
          }))
        )
        continue
      }

      for (const [index, document] of chunk.entries()) {
        const item = response.items[index]?.index
        if (!item) {
          result.failures.push({
            notificationId: document.notificationId,
            retryable: true,
            status: 502,
            errorClass: 'invalid_bulk_item',
            errorMessage: 'Elasticsearch bulk item was missing its index result',
          })
          continue
        }

        if (item.status >= 200 && item.status < 300) {
          result.appliedIds.push(document.notificationId)
          continue
        }

        const errorClass = item.error?.type ?? `elasticsearch_http_${item.status}`
        if (item.status === 409 && errorClass === 'version_conflict_engine_exception') {
          result.staleIds.push(document.notificationId)
          continue
        }

        result.failures.push({
          notificationId: document.notificationId,
          retryable: isRetryableStatus(item.status, errorClass),
          status: item.status,
          errorClass,
          errorMessage: item.error?.reason ?? 'Elasticsearch projection failed',
        })
      }
    }

    return result
  }

  async purgeMany(
    physicalIndex: string,
    notificationIds: string[]
  ): Promise<NotificationPhysicalPurgeResult> {
    const uniqueIds = [...new Set(notificationIds)]
    if (uniqueIds.length === 0) {
      return { appliedIds: [], failures: [] }
    }
    if (uniqueIds.length > MAX_BULK_DOCUMENTS) {
      throw new RangeError(
        `Notification Elasticsearch purge cannot exceed ${MAX_BULK_DOCUMENTS} documents`
      )
    }

    const response = await this.transport.bulk({
      operations: uniqueIds.map((notificationId) => ({
        delete: {
          _index: physicalIndex,
          _id: notificationId,
        },
      })),
    })
    if (response.items.length !== uniqueIds.length) {
      return {
        appliedIds: [],
        failures: uniqueIds.map((notificationId) => ({
          notificationId,
          retryable: true,
          status: 502,
          errorClass: 'invalid_bulk_response',
          errorMessage: 'Elasticsearch purge response item count did not match the request',
        })),
      }
    }

    const result: NotificationPhysicalPurgeResult = {
      appliedIds: [],
      failures: [],
    }
    for (const [index, notificationId] of uniqueIds.entries()) {
      const item = response.items[index]?.delete
      if (!item) {
        result.failures.push({
          notificationId,
          retryable: true,
          status: 502,
          errorClass: 'invalid_bulk_item',
          errorMessage: 'Elasticsearch purge item was missing its delete result',
        })
        continue
      }
      if ((item.status >= 200 && item.status < 300) || item.status === 404) {
        result.appliedIds.push(notificationId)
        continue
      }
      const errorClass = item.error?.type ?? `elasticsearch_http_${item.status}`
      result.failures.push({
        notificationId,
        retryable: isRetryableStatus(item.status, errorClass),
        status: item.status,
        errorClass,
        errorMessage: item.error?.reason ?? 'Elasticsearch tombstone purge failed',
      })
    }
    return result
  }
}
