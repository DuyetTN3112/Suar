import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import { BaseQuery } from '#modules/marketplace/actions/base_query'
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
export class GetMarketplaceTasksQuery extends BaseQuery<
  MarketplacePublicTaskListingInput,
  MarketplacePublicTaskListingResult
> {
  constructor(
    private readonly taskListing: MarketplacePublicTaskListingReader,
    private readonly organizationAccess: MarketplaceOrganizationAccessReader,
    private readonly execCtx: HttpActionContext
  ) {
    super()
  }

  public override handle(
    input: MarketplacePublicTaskListingInput
  ): Promise<MarketplacePublicTaskListingResult> {
    return this.listForActor(input)
  }

  public async executeAndWrap(
    input: MarketplacePublicTaskListingInput
  ): Promise<Result<MarketplacePublicTaskListingResult, AppException>> {
    try {
      return Result.ok(await this.handle(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
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
