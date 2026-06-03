import type {
  FilterSavedViewGrantTarget,
  FilterSavedViewOwner,
  FilterSavedViewRecord,
} from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
export { FilterSavedViewAccessError } from '#modules/filtering/public_contracts/filter_saved_view_errors'

export type FilterSavedViewAction = 'read' | 'edit' | 'delete' | 'share' | 'subscribe'

export interface FilterSavedViewAuthorization {
  canCreate(input: {
    readonly principal: FilterPrincipal
    readonly owner: FilterSavedViewOwner
  }): Promise<boolean>
  canPerform(input: {
    readonly principal: FilterPrincipal
    readonly action: FilterSavedViewAction
    readonly record: FilterSavedViewRecord
  }): Promise<boolean>
  canShareWith(input: {
    readonly principal: FilterPrincipal
    readonly record: FilterSavedViewRecord
    readonly target: FilterSavedViewGrantTarget
  }): Promise<boolean>
  listAuthorizedViewIds(input: {
    readonly principal: FilterPrincipal
    readonly context: string
    readonly action: 'read'
  }): Promise<readonly string[]>
}
