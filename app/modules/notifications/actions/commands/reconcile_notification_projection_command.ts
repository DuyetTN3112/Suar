import type { NotificationProjectionReconciliationReport } from '#modules/notifications/actions/dtos/notification_projection_lifecycle'
import type { NotificationProjectionReconciler } from '#modules/notifications/actions/ports/outbound/notification_projection_reconciler'
import type { NotificationProjectionRun } from '#modules/notifications/domain/notification_projection_lifecycle'

interface NotificationProjectionReconciliationOperations {
  initializeReconciliation(input: {
    actorId: string
    reason: string
  }): Promise<NotificationProjectionRun>
  completeReconciliation(runId: string, passed: boolean): Promise<void>
}

export class ReconcileNotificationProjectionCommand {
  private readonly operations: NotificationProjectionReconciliationOperations
  private readonly reconciler: NotificationProjectionReconciler

  constructor(options: {
    operations: NotificationProjectionReconciliationOperations
    reconciler: NotificationProjectionReconciler
  }) {
    this.operations = options.operations
    this.reconciler = options.reconciler
  }

  async execute(input: {
    actorId: string
    reason: string
    repair: boolean
  }): Promise<NotificationProjectionReconciliationReport> {
    const reason = input.reason.trim()
    if (reason.length < 10 || reason.length > 500) {
      throw new RangeError('Projection reconciliation reason must contain 10 to 500 characters')
    }
    const run = await this.operations.initializeReconciliation({
      actorId: input.actorId,
      reason,
    })
    let report = await this.reconciler.reconcile(run, { repair: input.repair })
    if (input.repair && !report.passed && report.repaired > 0) {
      report = await this.reconciler.reconcile(run, { repair: false })
    }
    await this.operations.completeReconciliation(run.id, report.passed)
    return report
  }
}
