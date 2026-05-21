import { BaseCommand } from '#modules/filtering/actions/base_command'
import type { CreateFilterAlertCommand, CreateFilterAlertCommandInput } from '#modules/filtering/actions/commands/filter-alert/create_filter_alert_command'
import type { FilterAlertRecord } from '#modules/filtering/actions/ports/outbound/filter_alert_repository'
import type { ExecuteSavedFilterViewQuery } from '#modules/filtering/actions/queries/saved-filter-views/execute_saved_filter_view_query'
import type { GetSavedFilterViewQuery } from '#modules/filtering/actions/queries/saved-filter-views/get_saved_filter_view_query'
import type { FilterContextProvider } from '#modules/filtering/public_contracts/filter_context_provider'

export type CreateFilterAlertWorkflowInput = Omit<CreateFilterAlertCommandInput, 'policy'> & {
  readonly requestId: string
}






export class CreateFilterAlertWorkflow extends BaseCommand<
  CreateFilterAlertWorkflowInput,
  FilterAlertRecord
> {

  constructor(
    private readonly views: Pick<GetSavedFilterViewQuery, 'execute'>,
    private readonly executeSavedView: Pick<ExecuteSavedFilterViewQuery, 'execute'>,
    private readonly contexts: FilterContextProvider,
    private readonly createAlert: Pick<CreateFilterAlertCommand, 'executeAndWrap'>
  ) {
    super()
  }

  async handle(input: CreateFilterAlertWorkflowInput): Promise<FilterAlertRecord> {
    const record = await this.views.execute({ principal: input.principal, viewId: input.viewId })
    const definition = await this.contexts.getEffectiveDefinition({
      context: record.view.context.key,
      principal: input.principal,
    })
    const probe = await this.executeSavedView.execute({
      principal: input.principal,
      viewId: input.viewId,
      requestId: input.requestId,
      page: { size: 1 },
    })

    const result = await this.createAlert.executeAndWrap({
      principal: input.principal,
      viewId: input.viewId,
      intervalMinutes: input.intervalMinutes,
      timezone: input.timezone,
      policy: {
        hasSubscriptionPermission: true,
        contextAlertsEnabled: definition.capabilities.alerts,
        providerState: probe.execution.degraded || probe.execution.partial ? 'degraded' : 'healthy',
        totalRelation: probe.total.relation,
        queryCost: 0,
        maxQueryCost: definition.limits.maxCost,
      },
      now: input.now,
      alertId: input.alertId,
    })
    return result.getValue()
  }
}
