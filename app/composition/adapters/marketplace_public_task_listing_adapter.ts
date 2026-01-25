import type {
  MarketplacePublicTaskListingInput,
  MarketplacePublicTaskListingResult,
  MarketplaceTaskListingContext,
} from '#modules/marketplace/actions/dtos/marketplace_public_task_listing'
import type { MarketplacePublicTaskListingReader } from '#modules/marketplace/actions/ports/outbound/marketplace_public_task_listing_reader'
import { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'

interface TasksPublicListingQuery {
  handle(input: GetPublicTasksDTO): Promise<MarketplacePublicTaskListingResult>
}

export class MarketplacePublicTaskListingAdapter
  implements MarketplacePublicTaskListingReader
{
  constructor(
    private readonly makeTasksQuery: (
      context: MarketplaceTaskListingContext
    ) => TasksPublicListingQuery
  ) {}

  list(
    input: MarketplacePublicTaskListingInput,
    context: MarketplaceTaskListingContext
  ): Promise<MarketplacePublicTaskListingResult> {
    return this.makeTasksQuery(context).handle(GetPublicTasksDTO.fromFilters(input))
  }
}
