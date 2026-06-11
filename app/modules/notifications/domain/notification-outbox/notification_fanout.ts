import type { NotificationCommandV1Input } from '#modules/notifications/domain/notification-feed/notification_command'

export type NotificationFanoutJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'completed_with_errors'

export type NotificationFanoutTargetStatus = 'pending' | 'leased' | 'processed' | 'dead_letter'

export interface NotificationFanoutTemplateV1Input extends Omit<
  NotificationCommandV1Input,
  'eventId' | 'recipientId'
> {
  eventName: string
  businessEventId: string
}

export interface NotificationFanoutStageResult {
  status: 'staged' | 'duplicate'
  jobId: string
  targetCount: number
}

export interface NotificationFanoutWorkTarget {
  id: string
  jobId: string
  sequence: number
  eventId: string
  recipientId: string
  command: NotificationCommandV1Input
  attemptCount: number
  leaseToken: string
  lockedUntil: Date
}

export interface NotificationFanoutClaimInput {
  workerId: string
  batchSize: number
  leaseDurationMs: number
  now: Date
  signal?: AbortSignal
}

export interface NotificationFanoutLeaseInput {
  targetId: string
  leaseToken: string
  now: Date
}

export interface NotificationFanoutFailureInput extends NotificationFanoutLeaseInput {
  errorClass: string
  errorMessage: string
  signal?: AbortSignal
}

export interface NotificationFanoutRetryInput extends NotificationFanoutFailureInput {
  availableAt: Date
}

export interface NotificationFanoutReplaySelector {
  ids?: string[]
  jobId?: string
  fromSequence?: number
  toSequence?: number
  errorClass?: string
}

export interface NotificationFanoutReplayRow {
  id: string
  jobId: string
  sequence: number
  previousStatus: 'dead_letter'
}
