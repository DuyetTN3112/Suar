import type { AuthenticatedHttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { MarketplaceTaskListingInput } from '#modules/marketplace/controllers/mappers/request/marketplace_task_request_mapper'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'

export async function normalizeMarketplaceTaskSortForActor(
  input: MarketplaceTaskListingInput,
  execCtx: AuthenticatedHttpActionContext
): Promise<MarketplaceTaskListingInput> {
  if (input.sort_by !== 'recommended' || !execCtx.organizationId) {
    return input
  }

  const membership = await organizationPublicApi.getMembershipContext(
    execCtx.organizationId,
    execCtx.userId
  )

  if (!organizationPublicApi.canAccessAdminShell(membership?.role ?? null).allowed) {
    return input
  }

  return {
    ...input,
    sort_by: 'created_at',
  }
}
