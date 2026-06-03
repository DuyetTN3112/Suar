import { BaseCommand } from '#modules/filtering/actions/base_command'
import type { FilterAlertRecord, FilterAlertRepository } from '#modules/filtering/actions/ports/outbound/filter_alert_repository'
import { FilterSavedViewAccessError, type FilterSavedViewAuthorization } from '#modules/filtering/actions/ports/outbound/filter_saved_view_authorization'
import type { FilterSavedViewRepository } from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import { FilterSavedViewRepositoryError } from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'

export interface UpdateFilterAlertInput {
  readonly principal: FilterPrincipal
  readonly viewId: string
  readonly expectedLockVersion: number
  readonly action: 'pause' | 'resume' | 'schedule' | 'delete'
  readonly intervalMinutes?: number
  readonly timezone?: string
  readonly now: string
}

export class UpdateFilterAlertCommand extends BaseCommand<
  UpdateFilterAlertInput,
  FilterAlertRecord | null
> {

  constructor(
    private readonly views: FilterSavedViewRepository,
    private readonly alerts: FilterAlertRepository,
    private readonly authorization: FilterSavedViewAuthorization
  ) {
    super()
  }

  async handle(input: UpdateFilterAlertInput): Promise<FilterAlertRecord | null> {
    const view = await this.views.findById(input.viewId)
    const alert = await this.alerts.findBySavedViewId(input.viewId)
    if (view === null || alert === null || !(await this.authorization.canPerform({ principal: input.principal, action: 'subscribe', record: view }))) throw new FilterSavedViewAccessError()
    if (alert.alert.ownerId !== input.principal.id) throw new FilterSavedViewAccessError()
    if (input.action === 'resume' && view.migrationState !== 'current') throw new FilterSavedViewAccessError()

    if (input.action === 'delete') {
      if (!(await this.alerts.softDelete({ alertId: alert.alert.id, expectedLockVersion: input.expectedLockVersion, deletedAt: input.now }))) throw new FilterSavedViewRepositoryError('OPTIMISTIC_CONFLICT')
      return null
    }
    const updated = input.action === 'schedule'
      ? await this.alerts.updateSchedule({ alertId: alert.alert.id, expectedLockVersion: input.expectedLockVersion, intervalMinutes: input.intervalMinutes ?? alert.alert.intervalMinutes, timezone: input.timezone ?? alert.alert.timezone, updatedAt: input.now })
      : await this.alerts.setStatus({ alertId: alert.alert.id, expectedLockVersion: input.expectedLockVersion, status: input.action === 'pause' ? 'paused' : 'active', pauseReason: input.action === 'pause' ? 'user_paused' : null, updatedAt: input.now })
    if (updated === null) throw new FilterSavedViewRepositoryError('OPTIMISTIC_CONFLICT')
    return updated
  }
}
