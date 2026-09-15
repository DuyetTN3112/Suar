import { BaseCommand } from '#modules/filtering/actions/base_command'
import { requireSavedViewContext } from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import type { FilterTransactionRunner } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import {
  FilterSavedViewAccessError,
  type FilterSavedViewAuthorization,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import {
  FilterSavedViewRepositoryError,
  type FilterSavedViewRecord,
  type FilterSavedViewRepository,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'
import {
  createSavedFilterView,
  type SavedFilterAlertState,
  type SavedFilterSemanticState,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import type {
  FilterContextProvider,
  FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'

export interface UpdateSavedFilterViewPatch {
  name?: string
  description?: string | null
  semanticState?: SavedFilterSemanticState
  presentationState?: Record<string, unknown>
  isDefault?: boolean
  isPinned?: boolean
  alertState?: SavedFilterAlertState
  repair?: boolean
}

export interface UpdateSavedFilterViewCommandInput {
  principal: FilterPrincipal
  viewId: string
  patch: UpdateSavedFilterViewPatch
  expectedLockVersion: number
}

export class UpdateSavedFilterViewCommand extends BaseCommand {
  constructor(
    private readonly transactions: FilterTransactionRunner,
    private readonly repository: FilterSavedViewRepository,
    private readonly authorization: FilterSavedViewAuthorization,
    private readonly contexts: FilterContextProvider,
    private readonly hashGenerator: FilterHashGenerator,
    private readonly clock: () => string = () => new Date().toISOString()
  ) {
    super()
  }

  handle(input: UpdateSavedFilterViewCommandInput): Promise<FilterSavedViewRecord> {
    return this.transactions.run(async (transaction) => {
      const current = await this.repository.findById(input.viewId, transaction)
      if (
        current === null ||
        !(await this.authorization.canPerform({
          principal: input.principal,
          action: 'edit',
          record: current,
        }))
      ) {
        throw new FilterSavedViewAccessError()
      }
      const alertState = input.patch.alertState ?? current.view.alertState
      const repairing = input.patch.repair === true
      if (
        repairing &&
        (current.migrationState === 'current' || input.patch.semanticState === undefined)
      ) {
        throw new FilterSavedViewAccessError()
      }
      await requireSavedViewContext(this.contexts, {
        context: current.view.context,
        principal: input.principal,
        requireAlerts: alertState.status !== 'disabled',
      })
      const view = createSavedFilterView(
        {
          ...current.view,
          name: input.patch.name ?? current.view.name,
          description:
            input.patch.description === undefined ? current.view.description : input.patch.description,
          semanticState: input.patch.semanticState ?? current.view.semanticState,
          presentationState: input.patch.presentationState ?? current.view.presentationState,
          isDefault: input.patch.isDefault ?? current.view.isDefault,
          isPinned: input.patch.isPinned ?? current.view.isPinned,
          alertState,
          updatedAt: this.clock(),
        },
        {},
        this.hashGenerator
      )
      const updated = await this.repository.update(
        {
          record: {
            ...current,
            view,
            migrationState: repairing ? 'current' : current.migrationState,
          },
          expectedLockVersion: input.expectedLockVersion,
        },
        transaction
      )
      if (updated === null) {
        throw new FilterSavedViewRepositoryError('OPTIMISTIC_CONFLICT')
      }
      return updated
    })
  }
}
