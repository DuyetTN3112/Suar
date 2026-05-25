import type { NotificationRecord } from '#modules/notifications/actions/ports/outbound/notification_repository'

export interface NotificationCanonicalFeedPage {
  data: NotificationRecord[]
  total: number | null
  nextCursor: string | null
  previousCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface NotificationCanonicalFeedReadInput {
  recipientId: string
  page: number
  limit: number
  unreadOnly: boolean
  after: string | null
  before: string | null
  includeTotal: boolean
}

export interface NotificationCanonicalFeedReader {
  read(input: NotificationCanonicalFeedReadInput): Promise<NotificationCanonicalFeedPage>
}

export interface NotificationSearchFeedReader {
  findByRecipient(input: {
    recipientId: string
    limit: number
    unreadOnly: boolean
    after?: string | null
    before?: string | null
  }): Promise<{
    data: NotificationRecord[]
    nextCursor: string | null
    previousCursor: string | null
    hasNextPage: boolean
    hasPreviousPage: boolean
  }>
}

export interface NotificationFeedFallbackAdmissionLease {
  release(): Promise<void>
}

export interface NotificationFeedFallbackAdmissionController {
  acquire(): Promise<NotificationFeedFallbackAdmissionLease | null>
}
