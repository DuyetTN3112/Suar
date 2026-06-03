// @ts-nocheck
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })
import { BaseCommand } from '#modules/filtering/actions/base_command'
import { requireSavedViewContext } from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import { FilterSavedViewAccessError } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import { FilterSavedViewRepositoryError } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import { createSavedFilterView } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
class UpdateSavedFilterViewCommand extends BaseCommand {
  constructor(
    transactions,
    repository,
    authorization,
    contexts,
    hashGenerator,
    clock = () => new Date().toISOString()
  ) {
    super()
    this.transactions = transactions
    this.repository = repository
    this.authorization = authorization
    this.contexts = contexts
    this.hashGenerator = hashGenerator
    this.clock = clock
  }
  transactions
  repository
  authorization
  contexts
  hashGenerator
  clock
  static {
    __name(this, 'UpdateSavedFilterViewCommand')
  }
  handle(input) {
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
        (current.migrationState === 'current' || input.patch.semanticState === void 0)
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
            input.patch.description === void 0 ? current.view.description : input.patch.description,
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
export { UpdateSavedFilterViewCommand }

export interface UpdateSavedFilterViewCommand {
  executeAndWrap(input: any): Promise<any>
  handle(input: any): any
}
