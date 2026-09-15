import { BaseCommand } from '#modules/filtering/actions/base_command'
import {
  requireSavedViewActorId,
  requireSavedViewContext,
} from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import type { FilterTransactionRunner } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import {
  FilterSavedViewAccessError,
  type FilterSavedViewAuthorization,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import type {
  FilterSavedViewRecord,
  FilterSavedViewRepository,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'
import { createSavedFilterView } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import type {
  FilterContextProvider,
  FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'

export interface DuplicateSavedFilterViewCommandInput {
  principal: FilterPrincipal
  viewId: string
  name: string
}

export class DuplicateSavedFilterViewCommand extends BaseCommand {
  constructor(
    private readonly transactions: FilterTransactionRunner,
    private readonly repository: FilterSavedViewRepository,
    private readonly authorization: FilterSavedViewAuthorization,
    private readonly contexts: FilterContextProvider,
    private readonly hashGenerator: FilterHashGenerator,
    private readonly clock: () => string = () => new Date().toISOString(),
    private readonly idGenerator: () => string = () => crypto.randomUUID()
  ) {
    super()
  }

  handle(input: DuplicateSavedFilterViewCommandInput): Promise<FilterSavedViewRecord> {
    const actorId = requireSavedViewActorId(input.principal)
    const occurredAt = this.clock()
    return this.transactions.run(async (transaction) => {
      const source = await this.repository.findById(input.viewId, transaction)
      if (
        source === null ||
        !(await this.authorization.canPerform({
          principal: input.principal,
          action: 'read',
          record: source,
        }))
      ) {
        throw new FilterSavedViewAccessError()
      }
      await requireSavedViewContext(this.contexts, {
        context: source.view.context,
        principal: input.principal,
      })
      const view = createSavedFilterView(
        {
          ...source.view,
          id: this.idGenerator(),
          name: input.name,
          ownerId: actorId,
          visibility: 'private',
          organizationId: null,
          teamId: null,
          isDefault: false,
          isPinned: false,
          alertState: { status: 'disabled', reason: null },
          createdAt: occurredAt,
          updatedAt: occurredAt,
        },
        {},
        this.hashGenerator
      )
      return this.repository.create({ owner: { type: 'user', id: actorId }, view }, transaction)
    })
  }
}
