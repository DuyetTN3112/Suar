import { BaseCommand } from '#modules/filtering/actions/base_command'
import { requireSavedViewContext } from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import type { FilterAlertRecord, FilterAlertRepository } from '#modules/filtering/actions/ports/outbound/filter_alert_repository'
import { FilterSavedViewAccessError } from '#modules/filtering/actions/ports/outbound/filter_saved_view_authorization'
import type { FilterSavedViewAuthorization } from '#modules/filtering/actions/ports/outbound/filter_saved_view_authorization'
import type { FilterSavedViewRepository } from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import { createFilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'
import { evaluateFilterAlertPolicy, FilterAlertPolicyError, type FilterAlertPolicyInput } from '#modules/filtering/domain/filter-alert/filter_alert_policy'
import type { FilterContextProvider, FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'

export interface CreateFilterAlertCommandInput {
  readonly principal: FilterPrincipal
  readonly viewId: string
  readonly intervalMinutes: number
  readonly timezone: string
  readonly policy: Omit<FilterAlertPolicyInput, 'intervalMinutes' | 'timezone' | 'savedViewMigrationState'>
  readonly now: string
  readonly alertId: string
}

export class CreateFilterAlertCommand extends BaseCommand<
  CreateFilterAlertCommandInput,
  FilterAlertRecord
> {

  constructor(
    private readonly views: FilterSavedViewRepository,
    private readonly alerts: FilterAlertRepository,
    private readonly authorization: FilterSavedViewAuthorization,
    private readonly contexts: FilterContextProvider
  ) {
    super()
  }

  async handle(input: CreateFilterAlertCommandInput): Promise<FilterAlertRecord> {
    const actorId = input.principal.kind === 'user' ? input.principal.id : undefined
    if (!actorId) throw new FilterSavedViewAccessError()
    const record = await this.views.findById(input.viewId)
    if (
      record === null ||
      !(await this.authorization.canPerform({ principal: input.principal, action: 'subscribe', record }))
    ) throw new FilterSavedViewAccessError()

    await requireSavedViewContext(this.contexts, {
      context: record.view.context,
      principal: input.principal,
      requireAlerts: true,
    })

    const decision = evaluateFilterAlertPolicy({
      ...input.policy,
      savedViewMigrationState: record.migrationState,
      intervalMinutes: input.intervalMinutes,
      timezone: input.timezone,
    })
    if (!decision.allowed) throw new FilterAlertPolicyError(decision.reason ?? 'alert_policy_denied')

    const alert = createFilterAlert({
      id: input.alertId,
      savedViewId: record.view.id,
      ownerId: actorId,
      savedViewLockVersion: record.lockVersion,
      intervalMinutes: input.intervalMinutes,
      timezone: input.timezone,
      now: input.now,
    })
    const created = await this.alerts.create(alert)
    return created
  }
}
