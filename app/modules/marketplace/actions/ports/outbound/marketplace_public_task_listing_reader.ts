import type {
  MarketplacePublicTaskListingInput,
  MarketplacePublicTaskListingResult,
  MarketplaceTaskListingContext,
} from '#modules/marketplace/actions/dtos/marketplace_public_task_listing'

export interface MarketplacePublicTaskListingReader {
  list(
    input: MarketplacePublicTaskListingInput,
    context: MarketplaceTaskListingContext
  ): Promise<MarketplacePublicTaskListingResult>
}
