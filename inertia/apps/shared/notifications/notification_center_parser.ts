import type {
  LatestNotificationPayload,
  NotificationAction,
  NotificationCenterItem,
  NotificationCenterPagination,
} from './notification_center_types.js'

export const MAX_LATEST_ITEMS = 100

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`)
  }
  return value as Record<string, unknown>
}

function stringValue(
  value: unknown,
  path: string,
  options: { nullable?: false; maximum?: number }
): string
function stringValue(
  value: unknown,
  path: string,
  options: { nullable: true; maximum?: number }
): string | null
function stringValue(
  value: unknown,
  path: string,
  options: { nullable?: boolean; maximum?: number } = {}
): string | null {
  if (options.nullable && value === null) {
    return null
  }
  const maximum = options.maximum ?? 512
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new TypeError(`${path} must be a non-empty string of at most ${maximum} characters`)
  }
  return value
}

function safeInteger(value: unknown, path: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum) {
    throw new TypeError(`${path} must be a safe integer greater than or equal to ${minimum}`)
  }
  return Number(value)
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${path} must be a boolean`)
  }
  return value
}

function timestamp(value: unknown, path: string, nullable = false): string | null {
  if (nullable && value === null) {
    return null
  }
  const text = stringValue(value, path, { maximum: 64 })
  if (Number.isNaN(Date.parse(text))) {
    throw new TypeError(`${path} must be an ISO-8601 timestamp`)
  }
  return text
}

function metadata(value: unknown, path: string): Record<string, unknown> | null {
  if (value === null) {
    return null
  }
  return record(value, path)
}

function action(value: unknown, path: string): NotificationAction | null {
  if (value === null) {
    return null
  }
  const input = record(value, path)
  const rawParams = record(input['params'], `${path}.params`)
  const params: Record<string, string> = {}
  for (const [key, rawValue] of Object.entries(rawParams)) {
    params[stringValue(key, `${path}.params key`, { maximum: 64 })] = stringValue(
      rawValue,
      `${path}.params.${key}`,
      { maximum: 512 }
    )
  }
  return {
    routeName: stringValue(input['routeName'], `${path}.routeName`, { maximum: 128 }),
    params,
  }
}

export function parseNotification(value: unknown, index: number): NotificationCenterItem {
  const path = `notification[${index}]`
  const input = record(value, path)
  if (input['schemaVersion'] !== 1) {
    throw new TypeError(`${path}.schemaVersion is unsupported`)
  }

  return {
    id: stringValue(input['id'], `${path}.id`, { maximum: 128 }),
    eventId: stringValue(input['eventId'], `${path}.eventId`, {
      nullable: true,
      maximum: 128,
    }),
    userId: stringValue(input['userId'], `${path}.userId`, { maximum: 128 }),
    title: stringValue(input['title'], `${path}.title`, { maximum: 1024 }),
    message: stringValue(input['message'], `${path}.message`, { maximum: 8192 }),
    isRead: booleanValue(input['isRead'], `${path}.isRead`),
    type: stringValue(input['type'], `${path}.type`, { maximum: 128 }),
    relatedEntityType: stringValue(
      input['relatedEntityType'],
      `${path}.relatedEntityType`,
      { nullable: true, maximum: 128 }
    ),
    relatedEntityId: stringValue(input['relatedEntityId'], `${path}.relatedEntityId`, {
      nullable: true,
      maximum: 512,
    }),
    metadata: metadata(input['metadata'], `${path}.metadata`),
    schemaVersion: 1,
    category: stringValue(input['category'], `${path}.category`, { maximum: 64 }),
    priority: stringValue(input['priority'], `${path}.priority`, { maximum: 32 }),
    action: action(input['action'], `${path}.action`),
    revision: safeInteger(input['revision'], `${path}.revision`, 1),
    occurredAt: timestamp(input['occurredAt'], `${path}.occurredAt`) as string,
    createdAt: timestamp(input['createdAt'], `${path}.createdAt`) as string,
    updatedAt: timestamp(input['updatedAt'], `${path}.updatedAt`) as string,
    readAt: timestamp(input['readAt'], `${path}.readAt`, true),
  }
}

export function parsePagination(value: unknown): NotificationCenterPagination {
  const input = record(value, 'pagination')
  if (input['mode'] !== 'cursor') {
    throw new TypeError('pagination.mode must be cursor')
  }
  return {
    mode: 'cursor',
    page: safeInteger(input['page'], 'pagination.page', 1),
    perPage: safeInteger(input['perPage'], 'pagination.perPage', 1),
    total: safeInteger(input['total'], 'pagination.total'),
    lastPage: safeInteger(input['lastPage'], 'pagination.lastPage', 1),
    hasNextPage: booleanValue(input['hasNextPage'], 'pagination.hasNextPage'),
    hasPreviousPage: booleanValue(input['hasPreviousPage'], 'pagination.hasPreviousPage'),
    nextCursor: stringValue(input['nextCursor'], 'pagination.nextCursor', {
      nullable: true,
      maximum: 2048,
    }),
    previousCursor: stringValue(input['previousCursor'], 'pagination.previousCursor', {
      nullable: true,
      maximum: 2048,
    }),
  }
}

export function parseLatestNotificationPayload(value: unknown): LatestNotificationPayload {
  const input = record(value, 'notification response')
  if (!Array.isArray(input['data']) || input['data'].length > MAX_LATEST_ITEMS) {
    throw new TypeError(`notification response.data must contain at most ${MAX_LATEST_ITEMS} items`)
  }

  return {
    data: input['data'].map(parseNotification),
    recipientId: stringValue(input['recipientId'], 'notification response.recipientId', {
      maximum: 128,
    }),
    unreadCount: safeInteger(input['unreadCount'], 'notification response.unreadCount'),
    recipientStateRevision: safeInteger(
      input['recipientStateRevision'],
      'notification response.recipientStateRevision',
      1
    ),
    pagination: parsePagination(input['pagination']),
  }
}
