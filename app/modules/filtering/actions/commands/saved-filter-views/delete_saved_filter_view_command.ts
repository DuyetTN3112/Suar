import { BaseCommand } from '#modules/filtering/actions/base_command'
import type { FilterTransactionRunner } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import {
  FilterSavedViewAccessError,
  type FilterSavedViewAuthorization,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import {
  FilterSavedViewRepositoryError,
  type FilterSavedViewRepository,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'

export interface DeleteSavedFilterViewCommandInput {
  principal: FilterPrincipal
  viewId: string
  expectedLockVersion: number
}

export class DeleteSavedFilterViewCommand extends BaseCommand {
  constructor(
    private readonly transactions: FilterTransactionRunner,
    private readonly repository: FilterSavedViewRepository,
    private readonly authorization: FilterSavedViewAuthorization,
    private readonly clock: () => string = () => new Date().toISOString()
  ) {
    super()
  }

  handle(input: DeleteSavedFilterViewCommandInput): Promise<void> {
    return this.transactions.run(async (transaction) => {
      const record = await this.repository.findById(input.viewId, transaction)
      if (
        record === null ||
        !(await this.authorization.canPerform({
          principal: input.principal,
          action: 'delete',
          record,
        }))
      ) {
        throw new FilterSavedViewAccessError()
      }
      const deleted = await this.repository.softDelete(
        {
          viewId: record.view.id,
          expectedLockVersion: input.expectedLockVersion,
          deletedAt: this.clock(),
        },
        transaction
      )
      if (!deleted) throw new FilterSavedViewRepositoryError('OPTIMISTIC_CONFLICT')
    })
  }
}
