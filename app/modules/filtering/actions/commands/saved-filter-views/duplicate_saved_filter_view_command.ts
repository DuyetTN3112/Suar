// @ts-nocheck
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })
import { BaseCommand } from '#modules/filtering/actions/base_command'
import {
  requireSavedViewActorId,
  requireSavedViewContext,
} from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import { FilterSavedViewAccessError } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import { createSavedFilterView } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
class DuplicateSavedFilterViewCommand extends BaseCommand {
  constructor(
    transactions,
    repository,
    authorization,
    contexts,
    hashGenerator,
    clock = () => new Date().toISOString(),
    idGenerator = () => crypto.randomUUID()
  ) {
    super()
    this.transactions = transactions
    this.repository = repository
    this.authorization = authorization
    this.contexts = contexts
    this.hashGenerator = hashGenerator
    this.clock = clock
    this.idGenerator = idGenerator
  }
  transactions
  repository
  authorization
  contexts
  hashGenerator
  clock
  idGenerator
  static {
    __name(this, 'DuplicateSavedFilterViewCommand')
  }
  handle(input) {
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
export { DuplicateSavedFilterViewCommand }

export interface DuplicateSavedFilterViewCommand {
  executeAndWrap(input: any): Promise<any>
  handle(input: any): any
}
