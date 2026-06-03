import type { CoordinateTaxonomyFilterConsumersCommand } from '#modules/filtering/actions/commands/filtering-observability/coordinate_taxonomy_filter_consumers_command'
import type { CreateFilterAlertCommand } from '#modules/filtering/actions/commands/filter-alert/create_filter_alert_command'
import type { CreateFilterAlertWorkflow } from '#modules/filtering/actions/commands/filter-alert/create_filter_alert_workflow'
import type { CreateSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import type { DeleteSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/delete_saved_filter_view_command'
import type { DuplicateSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/duplicate_saved_filter_view_command'
import type { ShareSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/share_saved_filter_view_command'
import type { UpdateFilterAlertCommand } from '#modules/filtering/actions/commands/filter-alert/update_filter_alert_command'
import type { UpdateSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/update_saved_filter_view_command'
import type { FilterSavedViewAuthorization } from '#modules/filtering/actions/ports/outbound/filter_saved_view_authorization'
import type { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import type { ExecuteSavedFilterViewQuery } from '#modules/filtering/actions/queries/saved-filter-views/execute_saved_filter_view_query'
import type { GetFilterAlertQuery } from '#modules/filtering/actions/queries/filter-alert/get_filter_alert_query'
import type { GetSavedFilterViewQuery } from '#modules/filtering/actions/queries/saved-filter-views/get_saved_filter_view_query'
import type { ListSavedFilterViewsQuery } from '#modules/filtering/actions/queries/saved-filter-views/list_saved_filter_views_query'
import type { FilterContextProvider } from '#modules/filtering/public_contracts/filter_context_provider'

export abstract class FilteringActionFactory {
  abstract readonly createRequestId: () => string
  abstract readonly filterContextProvider: FilterContextProvider
  abstract readonly executeFilterQuery: Pick<ExecuteFilterQuery, 'executeAndWrap'>
  abstract readonly createSavedFilterView: Pick<CreateSavedFilterViewCommand, 'handle' | 'executeAndWrap'>
  abstract readonly updateSavedFilterView: Pick<UpdateSavedFilterViewCommand, 'handle' | 'executeAndWrap'>
  abstract readonly deleteSavedFilterView: Pick<DeleteSavedFilterViewCommand, 'handle' | 'executeAndWrap'>
  abstract readonly duplicateSavedFilterView: Pick<DuplicateSavedFilterViewCommand, 'handle' | 'executeAndWrap'>
  abstract readonly shareSavedFilterView: Pick<ShareSavedFilterViewCommand, 'handle' | 'executeAndWrap'>
  abstract readonly createFilterAlert: Pick<CreateFilterAlertCommand, 'handle' | 'executeAndWrap'>
  abstract readonly createFilterAlertWorkflow: Pick<CreateFilterAlertWorkflow, 'handle' | 'executeAndWrap'>
  abstract readonly updateFilterAlert: Pick<UpdateFilterAlertCommand, 'handle' | 'executeAndWrap'>
  abstract readonly getSavedFilterView: Pick<GetSavedFilterViewQuery, 'executeAndWrap' | 'execute'>
  abstract readonly listSavedFilterViews: Pick<ListSavedFilterViewsQuery, 'executeAndWrap' | 'execute'>
  abstract readonly executeSavedFilterView: Pick<ExecuteSavedFilterViewQuery, 'executeAndWrap' | 'execute'>
  abstract readonly getFilterAlert: Pick<GetFilterAlertQuery, 'executeAndWrap' | 'execute'>
  abstract readonly savedViewAuthorization: FilterSavedViewAuthorization
  abstract readonly coordinateTaxonomyFilterConsumers: Pick<CoordinateTaxonomyFilterConsumersCommand, 'handle'>
}
