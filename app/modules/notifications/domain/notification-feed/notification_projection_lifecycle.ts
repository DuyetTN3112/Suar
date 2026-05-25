export type NotificationProjectionRunStatus =
  | 'initialized'
  | 'backfilling'
  | 'catching_up'
  | 'reconciling'
  | 'ready'
  | 'cutting_over'
  | 'completed'
  | 'failed'
  | 'aborted'

export interface NotificationProjectionRun {
  id: string
  status: NotificationProjectionRunStatus
  targetId: string
  sourceTargetId: string | null
  targetIndex: string
  sourceIndex: string | null
  s0Sequence: number
  s1Sequence: number | null
  lastNotificationId: string | null
  lastTombstoneId: string | null
  scannedCount: number
  projectedCount: number
}

export interface NotificationProjectionPlan {
  sourceTargetId: string | null
  sourceIndex: string | null
  targetIndex: string
  targetKey: string
  highWatermark: number
  activeNotifications: number
  retainedTombstones: number
}

export interface NotificationProjectionCatchupState {
  requiredThroughSequence: number
  checkpointSequence: number
  incompleteDeliveries: number
  deadLetterDeliveries: number
  caughtUp: boolean
}

export interface NotificationProjectionRollbackPlan {
  currentPrimaryId: string
  currentPrimaryIndex: string
  rollbackTargetId: string
  rollbackTargetIndex: string
  rollbackUntil: Date
  alreadyPrimary: boolean
  rollbackApprovalActorId: string | null
  rollbackApprovalReason: string | null
  previousPrimaryIndex: string | null
}
