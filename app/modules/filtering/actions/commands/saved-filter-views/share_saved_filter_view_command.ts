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
import {
  FilterSavedViewRepositoryError,
  type FilterSavedViewGrant,
  type FilterSavedViewRecord,
  type FilterSavedViewRepository,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'
import {
  createSavedFilterView,
  type SavedFilterViewVisibility,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import type {
  FilterContextProvider,
  FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'

function validGrants(grants: readonly FilterSavedViewGrant[]): boolean {
  const targets = new Set<string>()
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

export interface ShareSavedFilterViewCommandInput {
  principal: FilterPrincipal
  viewId: string
  visibility: SavedFilterViewVisibility
  organizationId?: string | null
  teamId?: string | null
  grants: readonly FilterSavedViewGrant[]
  expectedLockVersion: number
}

export class ShareSavedFilterViewCommand extends BaseCommand {
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

  handle(input: ShareSavedFilterViewCommandInput): Promise<FilterSavedViewRecord> {
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
          organizationId: input.organizationId ?? null,
          teamId: input.teamId ?? null,
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
