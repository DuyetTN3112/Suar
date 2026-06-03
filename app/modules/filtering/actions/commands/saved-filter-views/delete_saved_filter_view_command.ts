// @ts-nocheck
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })
import { BaseCommand } from '#modules/filtering/actions/base_command'
import { FilterSavedViewAccessError } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import { FilterSavedViewRepositoryError } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
class DeleteSavedFilterViewCommand extends BaseCommand {
  constructor(transactions, repository, authorization, clock = () => new Date().toISOString()) {
    super()
    this.transactions = transactions
    this.repository = repository
    this.authorization = authorization
    this.clock = clock
  }
  transactions
  repository
  authorization
  clock
  static {
    __name(this, 'DeleteSavedFilterViewCommand')
  }
  handle(input) {
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
export { DeleteSavedFilterViewCommand }

export interface DeleteSavedFilterViewCommand {
  executeAndWrap(input: any): Promise<any>
  handle(input: any): any
}
