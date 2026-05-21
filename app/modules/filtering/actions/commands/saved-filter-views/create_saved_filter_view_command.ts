// @ts-nocheck
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })
import { BaseCommand } from '#modules/filtering/actions/base_command'
import { FilterSavedViewAccessError } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import { createSavedFilterView } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
async function requireSavedViewContext(provider, input) {
  try {
    const definition = await provider.getEffectiveDefinition({
      context: input.context.key,
      principal: input.principal,
    })
    if (
      definition.key !== input.context.key ||
      definition.ownerModule !== input.context.owner ||
      definition.version !== input.context.schemaVersion ||
      !definition.capabilities.savedViews ||
      (input.requireSharing === true && !definition.capabilities.sharedViews) ||
      (input.requireAlerts === true && !definition.capabilities.alerts)
    ) {
      throw new FilterSavedViewAccessError()
    }
    return definition
  } catch (error) {
    if (error instanceof FilterSavedViewAccessError) throw error
    throw new FilterSavedViewAccessError()
  }
}
__name(requireSavedViewContext, 'requireSavedViewContext')
function requireSavedViewActorId(principal) {
  if (
    principal.kind === 'anonymous' ||
    typeof principal.id !== 'string' ||
    principal.id.trim().length === 0
  ) {
    throw new FilterSavedViewAccessError()
  }
  return principal.id
}
__name(requireSavedViewActorId, 'requireSavedViewActorId')
class CreateSavedFilterViewCommand extends BaseCommand {
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
    __name(this, 'CreateSavedFilterViewCommand')
  }
  handle(input) {
    const actorId = requireSavedViewActorId(input.principal)
    const occurredAt = this.clock()
    return this.transactions.run(async (transaction) => {
      await requireSavedViewContext(this.contexts, {
        context: input.context,
        principal: input.principal,
        requireSharing: input.visibility !== 'private',
        requireAlerts: input.alertState.status !== 'disabled',
      })
      if (
        !(await this.authorization.canCreate({ principal: input.principal, owner: input.owner })) ||
        (input.owner.type === 'user' && input.owner.id !== actorId)
      ) {
        throw new FilterSavedViewAccessError()
      }
      const view = createSavedFilterView(
        {
          id: this.idGenerator(),
          name: input.name,
          description: input.description,
          ownerId: input.owner.id,
          visibility: input.visibility,
          organizationId: input.organizationId,
          teamId: input.teamId,
          context: input.context,
          semanticState: input.semanticState,
          presentationState: input.presentationState,
          isDefault: input.isDefault,
          isPinned: input.isPinned,
          alertState: input.alertState,
          createdAt: occurredAt,
          updatedAt: occurredAt,
          lastSuccessfulMigrationVersion: input.context.schemaVersion,
        },
        {},
        this.hashGenerator
      )
      return this.repository.create({ owner: input.owner, view }, transaction)
    })
  }
}
export { CreateSavedFilterViewCommand, requireSavedViewActorId, requireSavedViewContext }

export interface CreateSavedFilterViewCommand {
  executeAndWrap(input: any): Promise<any>
  handle(input: any): any
}
