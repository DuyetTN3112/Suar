import type {
  NotificationProjectionCatchupState,
  NotificationProjectionPlan,
  NotificationProjectionRun,
} from '#modules/notifications/domain/notification-feed/notification_projection_lifecycle'

export interface NotificationProjectionReconciliationReport {
  missing: number
  stale: number
  extra: number
  ahead: number
  repaired: number
  passed: boolean
  samples: {
    missing: string[]
    stale: string[]
    extra: string[]
    ahead: string[]
  }
}

export type NotificationProjectionRebuildResult =
  | {
      status: 'dry_run'
      plan: NotificationProjectionPlan
    }
  | {
      status: 'waiting_for_catchup'
      run: NotificationProjectionRun
      catchup: NotificationProjectionCatchupState
    }
  | {
      status: 'reconciliation_blocked'
      run: NotificationProjectionRun
      reconciliation: NotificationProjectionReconciliationReport
    }
  | {
      status: 'ready_for_promotion'
      run: NotificationProjectionRun
      reconciliation: NotificationProjectionReconciliationReport | null
    }

export interface NotificationProjectionPromotionResult {
  status: 'completed'
  run: NotificationProjectionRun
}
