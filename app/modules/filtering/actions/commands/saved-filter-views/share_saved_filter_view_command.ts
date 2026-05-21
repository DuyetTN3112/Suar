// @ts-nocheck
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })
import { BaseCommand } from '#modules/filtering/actions/base_command'
import {
  requireSavedViewActorId,
  requireSavedViewContext,
} from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import { FilterSavedViewAccessError } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import { FilterSavedViewRepositoryError } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import { createSavedFilterView } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
function validGrants(grants) {
  const targets = new Set()
  for (const grant of grants) {
    const key = `${grant.target.type}\0${grant.target.id}`
    if (
      grant.target.id.trim().length === 0 ||
      targets.has(key) ||
      !(grant.read || grant.edit || grant.share || grant.subscribe)
    ) {
      return false
    }
    targets.add(key)
  }
  return true
}
__name(validGrants, 'validGrants')
class ShareSavedFilterViewCommand extends BaseCommand {
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
    __name(this, 'ShareSavedFilterViewCommand')
  }
  handle(input) {
    const actorId = requireSavedViewActorId(input.principal)
    return this.transactions.run(async (transaction) => {
      const current = await this.repository.findById(input.viewId, transaction)
      if (
        current === null ||
        !validGrants(input.grants) ||
        (input.visibility === 'private' && input.grants.length > 0) ||
        !(await this.authorization.canPerform({
          principal: input.principal,
          action: 'share',
          record: current,
        }))
      ) {
        throw new FilterSavedViewAccessError()
      }
      await requireSavedViewContext(this.contexts, {
        context: current.view.context,
        principal: input.principal,
        requireSharing: input.visibility !== 'private',
        requireAlerts: input.grants.some(({ subscribe }) => subscribe),
      })
      const targetsAllowed = await Promise.all(
        input.grants.map((grant) =>
          this.authorization.canShareWith({
            principal: input.principal,
            record: current,
            target: grant.target,
          })
        )
      )
      if (targetsAllowed.some((allowed) => !allowed)) throw new FilterSavedViewAccessError()
      const occurredAt = this.clock()
      const view = createSavedFilterView(
        {
          ...current.view,
          visibility: input.visibility,
          organizationId: input.organizationId,
          teamId: input.teamId,
          isDefault: false,
          updatedAt: occurredAt,
        },
        {},
        this.hashGenerator
      )
      const updated = await this.repository.update(
        { record: { ...current, view }, expectedLockVersion: input.expectedLockVersion },
        transaction
      )
      if (updated === null) throw new FilterSavedViewRepositoryError('OPTIMISTIC_CONFLICT')
      await this.repository.replaceGrants(
        { viewId: updated.view.id, grants: input.grants, actorId, occurredAt },
        transaction
      )
      return updated
    })
  }
}
export { ShareSavedFilterViewCommand }

export interface ShareSavedFilterViewCommand {
  executeAndWrap(input: any): Promise<any>
  handle(input: any): any
}
