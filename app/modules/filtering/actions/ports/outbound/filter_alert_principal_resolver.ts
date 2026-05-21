import type { FilterSavedViewRecord } from './filter_saved_view_repository.js'

import type { FilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'

export interface FilterAlertPrincipalResolver {
  resolve(input: { readonly alert: FilterAlert; readonly record: FilterSavedViewRecord }): Promise<FilterPrincipal | null>
}
