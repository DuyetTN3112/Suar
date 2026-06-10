import type { NotificationProjectionReconciliationReport } from '#modules/notifications/actions/dtos/notification_projection_lifecycle'
import type { NotificationProjectionRun } from '#modules/notifications/domain/notification-feed/notification_projection_lifecycle'

export interface NotificationProjectionReconciler {
  reconcile(
    run: NotificationProjectionRun,
    options: { repair: boolean }
  ): Promise<NotificationProjectionReconciliationReport>
}
