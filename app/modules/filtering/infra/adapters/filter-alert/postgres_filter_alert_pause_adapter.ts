import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import type { FilterAlertPausePort } from '#modules/filtering/actions/ports/outbound/filter_alert_pause_port'
import type { FilterAlertRepository } from '#modules/filtering/actions/ports/outbound/filter_alert_repository'
import type { FilterTransaction } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'

export class PostgresFilterAlertPauseAdapter implements FilterAlertPausePort {
  constructor(private readonly alerts: FilterAlertRepository) {}

  async pauseForSavedView(input: { savedViewId: string; reason: string; now: string; transaction?: FilterTransaction }): Promise<void> {
    const current = await this.alerts.findBySavedViewId(input.savedViewId, input.transaction)
    if (current === null || current.alert.status === 'paused') return
    const paused = await this.alerts.setStatus({
      alertId: current.alert.id,
      expectedLockVersion: current.lockVersion,
      status: 'paused',
      pauseReason: input.reason,
      updatedAt: input.now,
      ...(input.transaction === undefined ? {} : { transaction: input.transaction }),
    })
    if (paused === null) throw new ConflictException('filter_alert_pause_conflict')
  }
}
