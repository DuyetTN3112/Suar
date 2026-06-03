import { BaseQuery } from '#modules/filtering/actions/base_query'
import type { FilterAlertRecord, FilterAlertRepository } from '#modules/filtering/actions/ports/outbound/filter_alert_repository'
import { FilterSavedViewAccessError, type FilterSavedViewAuthorization } from '#modules/filtering/actions/ports/outbound/filter_saved_view_authorization'
import type { FilterSavedViewRepository } from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'

export class GetFilterAlertQuery extends BaseQuery {
  constructor(
    private readonly views: FilterSavedViewRepository,
    private readonly alerts: FilterAlertRepository,
    private readonly authorization: FilterSavedViewAuthorization
  ) {
    super()
  }

  async executeAndWrap(input: { principal: FilterPrincipal; viewId: string }) {
    return this.wrap(() => this.execute(input))
  }

  async execute(input: { principal: FilterPrincipal; viewId: string }): Promise<FilterAlertRecord> {
    const view = await this.views.findById(input.viewId)
    const alert = await this.alerts.findBySavedViewId(input.viewId)
    if (view === null || alert === null || !(await this.authorization.canPerform({ principal: input.principal, action: 'subscribe', record: view }))) throw new FilterSavedViewAccessError()
    return alert
  }
}
