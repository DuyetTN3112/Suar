import type { NotificationRecord } from '#modules/notifications/actions/ports/outbound/notification_repository'
import type { NotificationFeedReadSource } from '#modules/notifications/observability/notification_feed_runtime_metrics'

export interface NotificationFeedReadInput {
  recipientId: string
  page: number
  limit: number
  unreadOnly: boolean
  after: string | null
  before: string | null
}

export interface NotificationFeedReadResult {
  data: NotificationRecord[]
  total: number | null
  nextCursor: string | null
  previousCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
  source: NotificationFeedReadSource
}

export interface NotificationFeedReader {
  read(input: NotificationFeedReadInput): Promise<NotificationFeedReadResult>
}
