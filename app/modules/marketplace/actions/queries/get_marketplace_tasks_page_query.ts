import type {
  MarketplacePublicTaskListingInput,
  MarketplacePublicTaskListingResult,
} from '#modules/marketplace/actions/dtos/marketplace_public_task_listing'
import type {
  MarketplaceActiveSkill,
  MarketplaceSkillCatalogReader,
} from '#modules/marketplace/actions/ports/outbound/marketplace_skill_catalog_reader'
import type { GetMarketplaceTasksQuery } from '#modules/marketplace/actions/queries/get_marketplace_tasks_query'

export interface MarketplaceTasksPageResult {
  listing: MarketplacePublicTaskListingResult
  availableSkills: MarketplaceActiveSkill[]
}

export class GetMarketplaceTasksPageQuery {
  constructor(
    private readonly listingQuery: GetMarketplaceTasksQuery,
    private readonly skillCatalog: MarketplaceSkillCatalogReader
  ) {}

  async handle(input: MarketplacePublicTaskListingInput): Promise<MarketplaceTasksPageResult> {
    const [listing, availableSkills] = await Promise.all([
      this.listingQuery.handle(input),
      this.skillCatalog.listActive(),
    ])

    return {
      listing,
      availableSkills,
    }
  }
}
