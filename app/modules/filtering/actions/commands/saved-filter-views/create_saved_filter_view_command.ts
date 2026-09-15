import { BaseCommand } from '#modules/filtering/actions/base_command'
import type { FilterTransactionRunner } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import {
  FilterSavedViewAccessError,
  type FilterSavedViewAuthorization,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import type {
  FilterSavedViewOwner,
  FilterSavedViewRecord,
  FilterSavedViewRepository,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'
import {
  createSavedFilterView,
  type SavedFilterAlertState,
  type SavedFilterSemanticState,
  type SavedFilterViewContext,
  type SavedFilterViewVisibility,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import type {
  FilterContextProvider,
  FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
import type { FilterContextDefinition } from '#modules/filtering/public_contracts/filter_contracts'

export async function requireSavedViewContext(
  provider: FilterContextProvider,
  input: {
    context: SavedFilterViewContext
    principal: FilterPrincipal
    requireSharing?: boolean
    requireAlerts?: boolean
  }
): Promise<FilterContextDefinition> {
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

export function requireSavedViewActorId(principal: FilterPrincipal): string {
  if (
    principal.kind === 'anonymous' ||
    typeof principal.id !== 'string' ||
    principal.id.trim().length === 0
  ) {
    throw new FilterSavedViewAccessError()
  }
  return principal.id
}

export interface CreateSavedFilterViewCommandInput {
  principal: FilterPrincipal
  owner: FilterSavedViewOwner
  name: string
  description?: string | null
  visibility: SavedFilterViewVisibility
  organizationId?: string | null
  teamId?: string | null
  context: SavedFilterViewContext
  semanticState: SavedFilterSemanticState
  presentationState: Record<string, unknown>
  isDefault: boolean
  isPinned: boolean
  alertState: SavedFilterAlertState
}

export class CreateSavedFilterViewCommand extends BaseCommand {
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

  handle(input: CreateSavedFilterViewCommandInput): Promise<FilterSavedViewRecord> {
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
