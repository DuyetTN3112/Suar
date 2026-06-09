import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/marketplace/actions/base_query'
import type {
  MarketplacePublicTaskListingInput,
  MarketplacePublicTaskListingResult,
} from '#modules/marketplace/actions/dtos/marketplace_public_task_listing'
import type {
  MarketplaceActiveSkill,
  MarketplaceSkillCatalogReader,
} from '#modules/marketplace/actions/ports/outbound/marketplace_skill_catalog_reader'
import type { GetMarketplaceTasksQuery } from '#modules/marketplace/actions/queries/marketplace-application/get_marketplace_tasks_query'

export interface MarketplaceTasksPageResult {
  listing: MarketplacePublicTaskListingResult
  availableSkills: MarketplaceActiveSkill[]
}

export class GetMarketplaceTasksPageQuery extends BaseQuery<
  MarketplacePublicTaskListingInput,
  MarketplaceTasksPageResult
> {
  constructor(
    private readonly listingQuery: Pick<GetMarketplaceTasksQuery, 'handle' | 'executeAndWrap'>,
    private readonly skillCatalog: MarketplaceSkillCatalogReader
  ) {
    super()
  }

  override async handle(input: MarketplacePublicTaskListingInput): Promise<MarketplaceTasksPageResult> {
    const listing = await this.listingQuery.handle(input)
    const availableSkills = await this.skillCatalog.listActive()

    return {
      listing,
      availableSkills,
    }
  }

  async executeAndWrap(
    input: MarketplacePublicTaskListingInput
  ): Promise<Result<MarketplaceTasksPageResult, AppException>> {
    try {
      const listing = await this.listingQuery.executeAndWrap(input)
      if (listing.isFailure()) return Result.fail(listing.getError())

      const availableSkills = await this.skillCatalog.listActive()
      return Result.ok({ listing: listing.getValue(), availableSkills })
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}
