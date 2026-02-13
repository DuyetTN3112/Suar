import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export interface NotificationQueueOperationalStatus {
  pending: number
  leased: number
  retryPending: number
  processed: number
  deadLetter: number
  oldestPendingAgeMs: number | null
}

export interface NotificationFanoutOperationalStatus extends NotificationQueueOperationalStatus {
  activeJobs: number
  completedJobs: number
  completedWithErrorsJobs: number
}

export interface NotificationRetentionOperationalStatus {
  dueNotifications: number
  eligibleProcessedOutbox: number
  eligibleCompletedFanoutJobs: number
  outboxDeadLetters: number
  fanoutDeadLetters: number
  tombstonesAwaitingProjectionProof: number
  expiredRollbackTargets: number
  retiredIndicesAwaitingDeletion: number
}

export interface NotificationOperationsSnapshot {
  outbox: NotificationQueueOperationalStatus
  fanout: NotificationFanoutOperationalStatus
  retention: NotificationRetentionOperationalStatus
}

interface NotificationOperationsProvider {
  snapshot(now: Date, countLimit: number): Promise<NotificationOperationsSnapshot>
}

let provider: NotificationOperationsProvider | null = null

export function registerNotificationOperationsProvider(
  implementation: NotificationOperationsProvider
): void {
  provider = implementation
}

export function readNotificationOperationsSnapshot(
  now: Date,
  countLimit: number
): Promise<NotificationOperationsSnapshot> {
  if (!provider) {
    throw new InvariantViolationException(
      'Notification operations provider has not been registered'
    )
  }
  return provider.snapshot(now, countLimit)
}
