import type {
  NotificationOutboxDestination,
  NotificationOutboxReplaySelector,
} from './notification_outbox.js'

export const NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT = 100

export interface NotificationOutboxDeadLetterPreviewInput {
  selector: NotificationOutboxReplaySelector
  destination?: NotificationOutboxDestination
  afterSequence?: number
  limit: number
}

export interface NotificationOutboxDeadLetterPreviewItem {
  id: string
  sequence: number
  destination: NotificationOutboxDestination
  attemptCount: number
  errorClass: string
  deadLetteredAt: Date
}

export interface NotificationOutboxDeadLetterPreviewPage {
  items: NotificationOutboxDeadLetterPreviewItem[]
  hasMore: boolean
  nextAfterSequence: number | null
}

export interface NotificationOutboxDiscardRow {
  id: string
  sequence: number
  previousStatus: 'dead_letter'
}
