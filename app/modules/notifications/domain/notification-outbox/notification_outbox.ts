export type NotificationOutboxDestination = 'feed_search' | 'unread_cache'
export type NotificationOutboxStatus =
  | 'pending'
  | 'leased'
  | 'processed'
  | 'dead_letter'
  | 'discarded'

export interface NotificationOutboxJob {
  id: string
  sequence: number
  notificationId: string | null
  operationId: string
  sourceEventId: string
  eventKind: string
  revision: number
  projectionRevision: number
  destination: NotificationOutboxDestination
  partitionKey: string
  recipientId: string
  recipientStateRevision: number
  payload: Record<string, unknown>
  attemptCount: number
  leaseToken: string
  lockedUntil: Date
}

export interface NotificationOutboxClaimInput {
  workerId: string
  batchSize: number
  leaseDurationMs: number
  now: Date
  destination?: NotificationOutboxDestination
}

export interface NotificationOutboxLeaseMutationInput {
  jobId: string
  leaseToken: string
  now: Date
}

export interface NotificationOutboxHeartbeatInput extends NotificationOutboxLeaseMutationInput {
  leaseDurationMs: number
}

export interface NotificationOutboxFailureInput extends NotificationOutboxLeaseMutationInput {
  errorClass: string
  errorMessage: string
}

export interface NotificationOutboxRetryInput extends NotificationOutboxFailureInput {
  availableAt: Date
}

export interface NotificationOutboxReplaySelector {
  ids?: string[]
  fromSequence?: number
  toSequence?: number
  errorClass?: string
}

export interface NotificationOutboxReplayRow {
  id: string
  sequence: number
  previousStatus: 'dead_letter'
}

export interface NotificationOutboxHandlerContext {
  signal: AbortSignal
}

export type NotificationOutboxHandler = (
  job: NotificationOutboxJob,
  context: NotificationOutboxHandlerContext
) => Promise<void>

export interface NotificationOutboxRepository {
  claimBatch(input: NotificationOutboxClaimInput): Promise<NotificationOutboxJob[]>
  heartbeat(input: NotificationOutboxHeartbeatInput): Promise<boolean>
  acknowledge(input: NotificationOutboxLeaseMutationInput): Promise<boolean>
  retry(input: NotificationOutboxRetryInput): Promise<boolean>
  deadLetter(input: NotificationOutboxFailureInput): Promise<boolean>
}
