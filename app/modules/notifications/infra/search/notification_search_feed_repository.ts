import type { NotificationRecord } from '#modules/notifications/actions/ports/outbound/notification_repository'
import { NotificationFeedCursorError } from '#modules/notifications/domain/notification_contract_errors'
import type { ActiveNotificationSearchDocument } from '#modules/notifications/infra/search/notification_search_index_repository'
import type {
  NotificationFeedCursorCodec,
  NotificationFeedCursorValue,
} from '#modules/notifications/infra/security/notification_feed_cursor_codec'
import { searchClient } from '#platform/search/elasticsearch_client'

const NOTIFICATION_FEED_SOURCE_FIELDS = [
  'notificationId',
  'eventId',
  'recipientId',
  'scopeType',
  'scopeId',
  'organizationId',
  'type',
  'schemaVersion',
  'category',
  'priority',
  'state',
  'title',
  'body',
  'relatedEntityType',
  'relatedEntityId',
  'action',
  'metadata',
  'occurredAt',
  'createdAt',
  'updatedAt',
  'readAt',
  'revision',
  'projectionVersion',
  'deleted',
  'deletedAt',
] as const

interface NotificationSearchFeedRequest {
  index: string
  size: number
  timeout: '250ms'
  trackTotalHits: false
  query: {
    bool: {
      filter: Array<{ term: Record<string, string | boolean> }>
    }
  }
  sort: Array<Record<string, 'asc' | 'desc'>>
  searchAfter?: [string, string]
  sourceFields: readonly string[]
}

interface NotificationSearchFeedHit {
  source: ActiveNotificationSearchDocument
  sort: [string, string]
}

interface NotificationSearchFeedResponse {
  hits: NotificationSearchFeedHit[]
}

export interface NotificationSearchFeedTransport {
  search(request: NotificationSearchFeedRequest): Promise<NotificationSearchFeedResponse>
}

const defaultTransport: NotificationSearchFeedTransport = {
  search: async (request) => {
    const response = await searchClient.search<ActiveNotificationSearchDocument>({
      index: request.index,
      size: request.size,
      timeout: request.timeout,
      track_total_hits: request.trackTotalHits,
      query: request.query,
      sort: request.sort,
      ...(request.searchAfter === undefined ? {} : { search_after: request.searchAfter }),
      _source: [...request.sourceFields],
    })
    return {
      hits: response.hits.hits.flatMap((hit) => {
        if (!hit._source || !Array.isArray(hit.sort) || hit.sort.length < 2) {
          return []
        }
        return [
          {
            source: hit._source,
            sort: [String(hit.sort[0]), String(hit.sort[1])],
          },
        ]
      }),
    }
  },
}

interface NotificationSearchFeedRepositoryOptions {
  transport?: NotificationSearchFeedTransport
  cursorCodec: NotificationFeedCursorCodec
  readAlias: string
}

export interface NotificationSearchFeedPage {
  data: NotificationRecord[]
  nextCursor: string | null
  previousCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
}

function toNotificationRecord(document: ActiveNotificationSearchDocument): NotificationRecord {
  return {
    id: document.notificationId,
    event_id: document.eventId,
    user_id: document.recipientId,
    title: document.title,
    message: document.body,
    is_read: document.state === 'read',
    type: document.type,
    related_entity_type: document.relatedEntityType,
    related_entity_id: document.relatedEntityId,
    metadata: document.metadata,
    schema_version: document.schemaVersion,
    category: document.category,
    priority: document.priority,
    action: document.action,
    revision: document.revision,
    occurred_at: new Date(document.occurredAt),
    created_at: new Date(document.createdAt),
    updated_at: new Date(document.updatedAt),
    read_at: document.readAt ? new Date(document.readAt) : null,
  }
}

export class NotificationSearchFeedRepository {
  private readonly transport: NotificationSearchFeedTransport
  private readonly cursorCodec: NotificationFeedCursorCodec
  private readonly readAlias: string

  constructor(options: NotificationSearchFeedRepositoryOptions) {
    this.transport = options.transport ?? defaultTransport
    this.cursorCodec = options.cursorCodec
    this.readAlias = options.readAlias
  }

  async findByRecipient(input: {
    recipientId: string
    limit: number
    unreadOnly: boolean
    after?: string | null
    before?: string | null
  }): Promise<NotificationSearchFeedPage> {
    if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 100) {
      throw new RangeError('Notification feed limit must be between 1 and 100')
    }
    if (input.after && input.before) {
      throw new NotificationFeedCursorError()
    }
    const after: NotificationFeedCursorValue | null = input.after
      ? this.cursorCodec.decode(input.after, {
          direction: 'after',
          recipientId: input.recipientId,
          unreadOnly: input.unreadOnly,
        })
      : null
    const before: NotificationFeedCursorValue | null = input.before
      ? this.cursorCodec.decode(input.before, {
          direction: 'before',
          recipientId: input.recipientId,
          unreadOnly: input.unreadOnly,
        })
      : null
    if ((input.after && !after) || (input.before && !before)) {
      throw new NotificationFeedCursorError()
    }
    const cursor = after ?? before
    const isBeforeWindow = before !== null

    const filters: Array<{ term: Record<string, string | boolean> }> = [
      { term: { recipientId: input.recipientId } },
      { term: { deleted: false } },
    ]
    if (input.unreadOnly) {
      filters.push({ term: { state: 'unread' } })
    }

    const response = await this.transport.search({
      index: this.readAlias,
      size: input.limit + 1,
      timeout: '250ms',
      trackTotalHits: false,
      query: { bool: { filter: filters } },
      sort: [
        { createdAt: isBeforeWindow ? 'asc' : 'desc' },
        { notificationId: isBeforeWindow ? 'asc' : 'desc' },
      ],
      ...(cursor ? { searchAfter: [cursor.createdAt, cursor.notificationId] } : {}),
      sourceFields: NOTIFICATION_FEED_SOURCE_FIELDS,
    })
    const overflow = response.hits.length > input.limit
    const windowHits = response.hits.slice(0, input.limit)
    const pageHits = isBeforeWindow ? [...windowHits].reverse() : windowHits
    const first = pageHits[0]?.source
    const last = pageHits.at(-1)?.source

    return {
      data: pageHits.map((hit) => toNotificationRecord(hit.source)),
      nextCursor:
        (isBeforeWindow || overflow) && last
          ? this.cursorCodec.encode({
              direction: 'after',
              createdAt: last.createdAt,
              notificationId: last.notificationId,
              recipientId: input.recipientId,
              unreadOnly: input.unreadOnly,
            })
          : null,
      previousCursor:
        (isBeforeWindow ? overflow : Boolean(after)) && first
          ? this.cursorCodec.encode({
              direction: 'before',
              createdAt: first.createdAt,
              notificationId: first.notificationId,
              recipientId: input.recipientId,
              unreadOnly: input.unreadOnly,
            })
          : null,
      hasNextPage: isBeforeWindow ? Boolean(before) : overflow,
      hasPreviousPage: isBeforeWindow ? overflow : Boolean(after),
    }
  }
}
