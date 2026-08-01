export interface NotificationRetentionTombstone {
  notificationId: string
  finalRevision: number
}

export interface NotificationRetentionProjectionTarget {
  id: string
  physicalIndex: string
}

export interface NotificationTombstonePurgePlan {
  tombstones: NotificationRetentionTombstone[]
  targets: NotificationRetentionProjectionTarget[]
}

export interface NotificationRetentionStatus {
  dueNotifications: number
  eligibleProcessedOutbox: number
  eligibleCompletedFanoutJobs: number
  outboxDeadLetters: number
  fanoutDeadLetters: number
  tombstonesAwaitingProjectionProof: number
  expiredRollbackTargets: number
  retiredIndicesAwaitingDeletion: number
}

export interface NotificationRetentionRepository {
  operationalStatus(
    now: Date,
    processedBefore: Date,
    retiredBefore: Date
  ): Promise<NotificationRetentionStatus>
  expireCanonicalBatch(now: Date, limit: number): Promise<number>
  purgeProcessedOutbox(before: Date, limit: number): Promise<number>
  purgeCompletedFanoutJobs(before: Date, limit: number): Promise<number>
  tombstonePurgePlan(now: Date, limit: number): Promise<NotificationTombstonePurgePlan>
  confirmTombstonePurge(input: {
    now: Date
    notificationIds: string[]
    targetIds: string[]
  }): Promise<number>
  retireExpiredProjectionTargets(now: Date, limit: number): Promise<number>
  retiredProjectionIndexPlan(
    now: Date,
    limit: number
  ): Promise<Array<{ id: string; physicalIndex: string }>>
  confirmRetiredProjectionIndexDeletion(input: {
    now: Date
    targetId: string
    physicalIndex: string
  }): Promise<boolean>
  purgeTerminalLedger(before: Date, limit: number): Promise<number>
}
