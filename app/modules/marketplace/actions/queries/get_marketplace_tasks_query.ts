import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  MarketplacePublicTaskListingInput,
  MarketplacePublicTaskListingResult,
} from '#modules/marketplace/actions/dtos/marketplace_public_task_listing'
import type { MarketplaceOrganizationAccessReader } from '#modules/marketplace/actions/ports/outbound/marketplace_organization_access_reader'
import type { MarketplacePublicTaskListingReader } from '#modules/marketplace/actions/ports/outbound/marketplace_public_task_listing_reader'

/**
 * Marketplace-owned facade for public task listing.
 *
 * Phase 1 keeps task read/storage behavior in the tasks module while moving route ownership
 * and page contracts into marketplace.
 */
export class GetMarketplaceTasksQuery {
  constructor(
    private readonly taskListing: MarketplacePublicTaskListingReader,
    private readonly organizationAccess: MarketplaceOrganizationAccessReader,
    private readonly execCtx: HttpActionContext
  ) {}

  public handle(
    input: MarketplacePublicTaskListingInput
  ): Promise<MarketplacePublicTaskListingResult> {
    return this.listForActor(input)
  }

  private async listForActor(
    input: MarketplacePublicTaskListingInput
  ): Promise<MarketplacePublicTaskListingResult> {
    if (input.sort_by !== 'recommended' || !this.execCtx.organizationId) {
      return this.taskListing.list(input, this.execCtx)
    }

    const canUseRecommendedSort =
      this.execCtx.userId !== null &&
      (await this.organizationAccess.canUseRecommendedTaskSort(
        this.execCtx.organizationId,
        this.execCtx.userId
      ))

    return this.taskListing.list(
      canUseRecommendedSort
        ? {
            ...input,
            sort_by: 'created_at',
          }
        : input,
      this.execCtx
    )
  }
}
