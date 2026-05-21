import type { FilterTransaction } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import type { SavedFilterView } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'

export {
  FilterSavedViewRepositoryError,
  type FilterSavedViewRepositoryErrorCode,
} from '#modules/filtering/public_contracts/filter_saved_view_errors'

export type FilterSavedViewOwnerType = 'user' | 'organization'
export type FilterSavedViewGrantTargetType = 'user' | 'organization' | 'team'
export type FilterSavedViewMigrationState = 'current' | 'pending' | 'requires_repair' | 'blocked'

export interface FilterSavedViewReadOptions {
  readonly lock?: 'for_update'
}

export interface FilterSavedViewOwner {
  readonly type: FilterSavedViewOwnerType
  readonly id: string
}

export interface FilterSavedViewGrantTarget {
  readonly type: FilterSavedViewGrantTargetType
  readonly id: string
}

export interface FilterSavedViewGrant {
  readonly target: FilterSavedViewGrantTarget
  readonly read: boolean
  readonly edit: boolean
  readonly share: boolean
  readonly subscribe: boolean
}

export interface FilterSavedViewRecord {
  readonly owner: FilterSavedViewOwner
  readonly view: SavedFilterView
  readonly normalizedName: string
  readonly lockVersion: number
  readonly migrationState: FilterSavedViewMigrationState
  readonly deletedAt: string | null
}

export interface FilterSavedViewRepository {
  create(
    input: { readonly owner: FilterSavedViewOwner; readonly view: SavedFilterView },
    transaction: FilterTransaction
  ): Promise<FilterSavedViewRecord>
  findById(
    viewId: string,
    transaction?: FilterTransaction,
    options?: FilterSavedViewReadOptions
  ): Promise<FilterSavedViewRecord | null>
  listByIds(
    input: { readonly viewIds: readonly string[]; readonly context: string },
    transaction?: FilterTransaction
  ): Promise<readonly FilterSavedViewRecord[]>
  update(
    input: {
      readonly record: FilterSavedViewRecord
      readonly expectedLockVersion: number
    },
    transaction: FilterTransaction
  ): Promise<FilterSavedViewRecord | null>
  softDelete(
    input: {
      readonly viewId: string
      readonly expectedLockVersion: number
      readonly deletedAt: string
    },
    transaction: FilterTransaction
  ): Promise<boolean>
  replaceGrants(
    input: {
      readonly viewId: string
      readonly grants: readonly FilterSavedViewGrant[]
      readonly actorId: string
      readonly occurredAt: string
    },
    transaction: FilterTransaction
  ): Promise<void>
  listGrants(
    viewId: string,
    transaction?: FilterTransaction
  ): Promise<readonly FilterSavedViewGrant[]>
}
